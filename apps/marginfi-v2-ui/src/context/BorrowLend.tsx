import React, { createContext, FC, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MarginfiClient, MarginfiReadonlyClient } from "@mrgnlabs/marginfi-client-v2";
import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import Bank from "@mrgnlabs/marginfi-client-v2/src/bank";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { computeAccountSummary, DEFAULT_ACCOUNT_SUMMARY } from "~/api";
import { AccountSummary } from "~/types";
import { useTokenMetadata } from "./TokenMetadata";
import config from "~/config";
import { useRouter } from "next/router";
import { usePrevious } from "~/utils/usePrevious";

// @ts-ignore - Safe because context hook checks for null
const BorrowLendContext = createContext<BorrowLendState>();

interface BorrowLendState {
  fetching: boolean;
  refreshData: (isSubscribed?: boolean) => Promise<void>;
  mfiClient: MarginfiClient | null;
  userAccounts: MarginfiAccount[];
  selectedAccount: MarginfiAccount | null;
  banks: Bank[];
  accountSummary: AccountSummary;
}

const BorrowLendStateProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const { tokenMetadataMap } = useTokenMetadata();
  const router = useRouter();
  const requestedAccountAddress = useMemo(
    () => (router.query.accountAddress as string) ?? null,
    [router.query.accountAddress]
  );
  const previousRequestedAccountAddress = usePrevious(requestedAccountAddress);

  // User-agnostic state
  const [fetching, setFetching] = useState<boolean>(true);
  const [initialFetchDone, setInitialFetchDone] = useState<boolean>(false);
  const [mfiReadonlyClient, setMfiReadonlyClient] = useState<MarginfiReadonlyClient>();
  const [mfiClient, setMfiClient] = useState<MarginfiClient | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);

  // User-specific state
  const [userAccounts, setUserAccounts] = useState<MarginfiAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<MarginfiAccount | null>(null);
  const previousSelectedAccount = usePrevious(selectedAccount);
  const [accountSummary, setAccountSummary] = useState<AccountSummary>(DEFAULT_ACCOUNT_SUMMARY);

  useEffect(() => {
    (async function () {
      const roClient = await MarginfiReadonlyClient.fetch(config.mfiConfig, connection);
      setMfiReadonlyClient(roClient);

      if (!anchorWallet) {
        setMfiClient(null);
        return;
      }

      const client = await MarginfiClient.fetch(
        config.mfiConfig,
        //@ts-ignore
        anchorWallet,
        connection
      );
      setMfiClient(client);
    })();
  }, [anchorWallet, connection]);

  const fetchUserData = useCallback(async (): Promise<MarginfiAccount[]> => {
    if (!mfiClient) {
      return Promise.reject("marginfi client not ready");
    }
    return mfiClient.getMarginfiAccountsForAuthority();
  }, [mfiClient]);

  const fetchGroupData = useCallback(async (): Promise<Bank[]> => {
    if (!mfiReadonlyClient) return Promise.reject("marginfi client not ready");
    await mfiReadonlyClient.group.reload();
    return [...mfiReadonlyClient.group.banks.values()];
  }, [mfiReadonlyClient]);

  const refreshData = useCallback(
    async (isSubscribed: boolean = true) => {
      setFetching(true);

      try {
        const banks = await fetchGroupData();
        if (!isSubscribed) {
          console.log("Not subscribed, skipping refresh");
          return;
        }
        setBanks(banks);
      } catch (e) {
        console.warn(e);
      }

      try {
        const userAccounts = await fetchUserData();
        console.log(
          "Found accounts",
          userAccounts.map((a) => a.publicKey.toBase58())
        );

        if (!isSubscribed) {
          console.log("Not subscribed, skipping refresh");
          return;
        }
        setUserAccounts(userAccounts);
        setInitialFetchDone(true);
      } catch (e) {
        console.warn(e);
      }

      setFetching(false);
    },
    [fetchGroupData, fetchUserData]
  );

  useEffect(() => {
    if (!initialFetchDone) return;

    if (!requestedAccountAddress) {
      if (userAccounts.length > 0) {
        const firstAccountAddressStr = userAccounts[0].publicKey.toBase58();
        router.push(`/account/${firstAccountAddressStr}`, undefined, { shallow: true }).catch((e) => console.log(e));
      } else {
        setSelectedAccount(null);
      }
      return;
    }

    const requestedAccount =
      userAccounts.find((account) => account.publicKey.toBase58() === requestedAccountAddress) ?? null;
    if (previousRequestedAccountAddress !== requestedAccountAddress) {
      if (requestedAccount) {
        router
          .push(`/account/${requestedAccount.publicKey.toBase58()}`, undefined, { shallow: true })
          .catch((e) => console.log(e));
      } else {
        router.push("/", undefined, { shallow: true }).catch((e) => console.log(e));
      }
    } else if (requestedAccount?.publicKey.toBase58() !== previousSelectedAccount?.publicKey.toBase58()) {
      setSelectedAccount(requestedAccount);
    }
  }, [
    initialFetchDone,
    previousRequestedAccountAddress,
    previousSelectedAccount?.publicKey,
    requestedAccountAddress,
    router,
    userAccounts,
  ]);

  // Periodically update all data
  useEffect(() => {
    let isSubscribed = true;

    refreshData(isSubscribed).catch(() => {});
    const id = setInterval(() => {
      refreshData(isSubscribed).catch(() => {});
    }, 60_000);

    return () => {
      isSubscribed = false;
      clearInterval(id);
    };
  }, [refreshData]);

  useEffect(() => {
    if (selectedAccount === null) {
      setAccountSummary(DEFAULT_ACCOUNT_SUMMARY);
      return;
    }
    const summary = computeAccountSummary(selectedAccount, tokenMetadataMap);
    setAccountSummary(summary);
  }, [selectedAccount, tokenMetadataMap, userAccounts]);

  return (
    <BorrowLendContext.Provider
      value={{
        fetching,
        refreshData,
        mfiClient,
        accountSummary,
        banks,
        selectedAccount,
        userAccounts,
      }}
    >
      {children}
    </BorrowLendContext.Provider>
  );
};

const useBorrowLendState = () => {
  const context = useContext(BorrowLendContext);
  if (!context) {
    throw new Error("useBorrowLendState must be used within a BorrowLendStateProvider");
  }

  return context;
};

export { useBorrowLendState, BorrowLendStateProvider };
