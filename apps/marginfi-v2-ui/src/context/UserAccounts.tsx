import React, { createContext, FC, useCallback, useContext, useEffect, useState } from "react";
import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import { computeAccountSummary, DEFAULT_ACCOUNT_SUMMARY, makeExtendedBankInfo } from "~/api";
import { AccountSummary, ActiveBankInfo, ExtendedBankInfo, isActiveBankInfo, TokenAccountMap } from "~/types";
import { useBanks } from "~/context/Banks";
import { useProgram } from "~/context/Program";
import { useTokenAccounts } from "~/context/TokenAccounts";
import { toast } from "react-toastify";

// @ts-ignore - Safe because context hook checks for null
const UserAccountsContext = createContext<UserAccountsState>();

interface UserAccountsState {
  fetching: boolean;
  reload: () => Promise<void>;
  nativeSolBalance: number;
  userAccounts: MarginfiAccount[];
  selectedAccount: MarginfiAccount | null;
  extendedBankInfos: ExtendedBankInfo[];
  activeBankInfos: ActiveBankInfo[];
  accountSummary: AccountSummary;
}

const UserAccountsProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { mfiClient } = useProgram();
  const { bankInfos } = useBanks();
  const { fetchTokenAccounts } = useTokenAccounts();

  const [fetching, setFetching] = useState<boolean>(false);
  const [nativeSolBalance, setNativeSolBalance] = useState<number>(0);
  const [extendedBankInfos, setExtendedBankInfos] = useState<ExtendedBankInfo[]>([]);
  const [activeBankInfos, setActiveBankInfos] = useState<ActiveBankInfo[]>([]);
  const [userAccounts, setUserAccounts] = useState<MarginfiAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<MarginfiAccount | null>(null);
  const [accountSummary, setAccountSummary] = useState<AccountSummary>(DEFAULT_ACCOUNT_SUMMARY);

  const fetchUserData = useCallback(async (): Promise<{
    userAccounts: MarginfiAccount[];
    tokenAccountMap: TokenAccountMap;
    nativeSolBalance: number;
  }> => {
    const userAccounts = (mfiClient && (await mfiClient.getMarginfiAccountsForAuthority())) || [];
    const { tokenAccountMap, nativeSolBalance } = await fetchTokenAccounts();
    return { nativeSolBalance, tokenAccountMap, userAccounts };
  }, [fetchTokenAccounts, mfiClient]);

  const reload = useCallback(async () => {
    setFetching(true);

    try {
      const { tokenAccountMap, nativeSolBalance, userAccounts } = await fetchUserData();

      setUserAccounts(userAccounts);
      if (userAccounts.length === 0) {
        setSelectedAccount(null);
      } else {
        setSelectedAccount(userAccounts[0]);
      }

      const updatedExtendedBankInfos = bankInfos.map((bankInfo) => {
        const tokenAccount = tokenAccountMap.get(bankInfo.tokenMint.toBase58());
        if (tokenAccount === undefined) {
          throw new Error(`Token account not found for ${bankInfo.tokenMint}`);
        }
        return makeExtendedBankInfo(bankInfo, tokenAccount, nativeSolBalance, userAccounts[0]);
      });

      setNativeSolBalance(nativeSolBalance);
      setExtendedBankInfos(updatedExtendedBankInfos);
      setActiveBankInfos(updatedExtendedBankInfos.filter(isActiveBankInfo));
    } catch (e: any) {
      toast.error(e);
    }

    setFetching(false);
  }, [fetchUserData, bankInfos]);

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
        nativeSolBalance,
        accountSummary,
        extendedBankInfos,
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
