import React, { createContext, FC, useCallback, useContext, useEffect, useState } from "react";
import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import { computeAccountSummary, DEFAULT_ACCOUNT_SUMMARY, makeBankInfoForAccount } from "~/api";
import { AccountSummary, ActiveBankInfo, ExtendedBankInfo, isActiveBankInfo } from "~/types";
import { useBanks } from "~/context/Banks";
import { useProgram } from "~/context/Program";
import { useTokenAccounts } from "~/context/TokenAccounts";
import { toast } from "react-toastify";

// @ts-ignore - Safe because context hook checks for null
const UserAccountsContext = createContext<UserAccountsState>();

interface UserAccountsState {
  fetching: boolean;
  reload: () => Promise<void>;
  userAccounts: MarginfiAccount[];
  selectedAccount: MarginfiAccount | null;
  bankInfosForAccount: ExtendedBankInfo[];
  activeBankInfos: ActiveBankInfo[];
  accountSummary: AccountSummary;
}

const UserAccountsProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { mfiClient } = useProgram();
  const { bankInfos } = useBanks();
  const { tokenAccountMap, nativeSol } = useTokenAccounts();

  const [fetching, setFetching] = useState<boolean>(false);
  const [bankInfosForAccount, setBanksInfosForAccount] = useState<ExtendedBankInfo[]>([]);
  const [activeBankInfos, setActiveBankInfos] = useState<ActiveBankInfo[]>([]);
  const [userAccounts, setUserAccounts] = useState<MarginfiAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<MarginfiAccount | null>(null);
  const [accountSummary, setAccountSummary] = useState<AccountSummary>(DEFAULT_ACCOUNT_SUMMARY);

  const reload = useCallback(async () => {
    if (!mfiClient || !nativeSol) {
      setUserAccounts([]);
      setSelectedAccount(null);
      return;
    }

    setFetching(true);
    try {
      const userAccounts = await mfiClient.getMarginfiAccountsForAuthority();
      setUserAccounts(userAccounts);
      console.log(
        "Found accounts",
        userAccounts.map((a) => a.publicKey.toBase58())
      );

      if (userAccounts.length === 0) {
        setSelectedAccount(null);
      } else {
        setSelectedAccount(userAccounts[0]);
        const bankInfosForAccount = bankInfos.map((bankInfo) => {
          const tokenAccount = tokenAccountMap.get(bankInfo.tokenMint.toBase58());
          if (tokenAccount === undefined) {
            throw new Error(`Token account not found for ${bankInfo.tokenMint}`);
          }
          return makeBankInfoForAccount(bankInfo, tokenAccount, nativeSol, userAccounts[0]);
        });
        setBanksInfosForAccount(bankInfosForAccount);
        setActiveBankInfos(bankInfosForAccount.filter(isActiveBankInfo));
      }
    } catch (e: any) {
      toast.error(e);
    } finally {
      setFetching(false);
    }
  }, [mfiClient, bankInfos, tokenAccountMap, nativeSol]);

  useEffect(() => {
    reload();
    const id = setInterval(reload, 60_000);
    return () => clearInterval(id);
  }, [reload]);

  useEffect(() => {
    if (selectedAccount === null) {
      setAccountSummary(DEFAULT_ACCOUNT_SUMMARY);
      return;
    }
    setAccountSummary(computeAccountSummary(selectedAccount));
  }, [selectedAccount]);

  return (
    <UserAccountsContext.Provider
      value={{
        fetching,
        reload,
        accountSummary,
        bankInfosForAccount,
        activeBankInfos,
        selectedAccount,
        userAccounts,
      }}
    >
      {children}
    </UserAccountsContext.Provider>
  );
};

const useUserAccounts = () => {
  const context = useContext(UserAccountsContext);
  if (!context) {
    throw new Error("useUserAccountsState must be used within a UserAccountsStateProvider");
  }

  return context;
};

export { useUserAccounts, UserAccountsProvider };
