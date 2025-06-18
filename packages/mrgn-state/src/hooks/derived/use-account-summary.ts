import React from "react";
import { useWrappedMarginfiAccount } from "./use-wrapped-account";
import { DEFAULT_ACCOUNT_SUMMARY } from "../../consts";
import { computeAccountSummary } from "../../lib";
import { PublicKey } from "@solana/web3.js";

export function useAccountSummary(authority?: PublicKey) {
  const { wrappedAccount } = useWrappedMarginfiAccount(authority);

  const accountSummary = React.useMemo(() => {
    return wrappedAccount ? computeAccountSummary(wrappedAccount) : DEFAULT_ACCOUNT_SUMMARY;
  }, [wrappedAccount]);

  return accountSummary;
}
