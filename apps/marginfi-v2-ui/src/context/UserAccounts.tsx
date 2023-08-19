import React, { createContext, FC, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";
import { computeAccountSummary, DEFAULT_ACCOUNT_SUMMARY, fetchTokenAccounts, makeExtendedBankInfo } from "~/api";
import { AccountSummary, ExtendedBankInfo, TokenAccount, TokenAccountMap } from "~/types";
import { useMarginfiClient } from "~/context/MarginfiClient";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

// @ts-ignore - Safe because context hook checks for null
const UserAccountsContext = createContext<UserAccountsState>();

interface UserAccountsState {
  fetching: boolean;
  reload: () => Promise<void>;
  nativeSolBalance: number;
  tokenAccountMap: TokenAccountMap;
  userAccounts: MarginfiAccount[];
  selectedAccount: MarginfiAccount | null;
  extendedBankInfos: ExtendedBankInfo[];
  accountSummary: AccountSummary;
}

const UserAccountsProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { mfiClient, bankInfos } = useMarginfiClient();

  const [fetching, setFetching] = useState<boolean>(false);
  const [nativeSolBalance, setNativeSolBalance] = useState<number>(0);
  const [tokenAccountMap, setTokenAccountMap] = useState<TokenAccountMap>(new Map<string, TokenAccount>());
  const [extendedBankInfos, setExtendedBankInfos] = useState<ExtendedBankInfo[]>([]);
  const [userAccounts, setUserAccounts] = useState<MarginfiAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<MarginfiAccount | null>(null);

  const reload = useCallback(async () => {
    setFetching(true);

    if (!wallet.publicKey || !mfiClient || mfiClient.isReadOnly) {
      const updatedExtendedBankInfos = bankInfos.map((bankInfo) =>
        makeExtendedBankInfo(
          bankInfo,
          {
            created: false,
            mint: bankInfo.tokenMint,
            balance: 0,
          },
          nativeSolBalance,
          null
        )
      );
      setExtendedBankInfos(updatedExtendedBankInfos);

      return;
    }

    try {
      const { tokenAccountMap, nativeSolBalance } = await fetchTokenAccounts(connection, wallet.publicKey, bankInfos);

      const userAccounts = await mfiClient.getMarginfiAccountsForAuthority();

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
      setTokenAccountMap(tokenAccountMap);
      setExtendedBankInfos(updatedExtendedBankInfos);
    } catch (e: any) {
      console.log(e);
    }

    setFetching(false);
  }, [bankInfos, connection, nativeSolBalance, wallet.publicKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ omit mfiClient since we know bankInfos are updated right after (useMemo)

  useEffect(() => {
    reload();
  }, [reload]);

  const accountSummary = useMemo(
    () => (selectedAccount ? computeAccountSummary(selectedAccount, bankInfos) : DEFAULT_ACCOUNT_SUMMARY),
    [selectedAccount, bankInfos]
  );

  return (
    <UserAccountsContext.Provider
      value={{
        fetching,
        reload,
        nativeSolBalance,
        tokenAccountMap,
        accountSummary,
        extendedBankInfos,
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
