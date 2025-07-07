import React from "react";
import { PublicKey } from "@solana/web3.js";
import { MarginfiAccount, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { Wallet } from "@mrgnlabs/mrgn-common";

import { useMarginfiAccount } from "../react-query";
import { useMarginfiClient } from "./use-marginfi-client";

/**
 * Returns a wrapped MarginFi account with proper loading and error states
 * @param authority - The public key of the account authority
 * @returns Wrapped account with loading and error states
 */
export function useWrappedMarginfiAccount(wallet?: Wallet) {
  const { data: account, isLoading: isLoadingAccount, isError: isErrorAccount } = useMarginfiAccount();

  const { marginfiClient, isLoading: isLoadingClient, isError: isErrorClient } = useMarginfiClient(wallet);

  const isLoading = isLoadingAccount || isLoadingClient;
  const isError = isErrorAccount || isErrorClient;

  // Data is ready when we have both account and client, and no errors
  const isReady = !isLoading && !isError && !!account && !!marginfiClient;

  const wrappedAccount = React.useMemo(() => {
    if (!account || !marginfiClient || isError) {
      return null;
    }

    try {
      return new MarginfiAccountWrapper(account.address, marginfiClient, MarginfiAccount.fromAccountType(account));
    } catch (error) {
      console.error("Failed to create MarginfiAccountWrapper:", error);
      return null;
    }
  }, [account, marginfiClient, isError]);

  return {
    wrappedAccount,
    isLoading,
    isError,
    isReady,
  };
}
