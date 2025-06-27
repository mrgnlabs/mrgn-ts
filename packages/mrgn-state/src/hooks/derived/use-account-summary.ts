import React from "react";
import { useWrappedMarginfiAccount } from "./use-wrapped-account";
import { DEFAULT_ACCOUNT_SUMMARY } from "../../consts";
import { computeAccountSummary } from "../../lib";

export function useAccountSummary() {
  const { wrappedAccount } = useWrappedMarginfiAccount();

  const accountSummary = React.useMemo(() => {
    return wrappedAccount ? computeAccountSummary(wrappedAccount) : DEFAULT_ACCOUNT_SUMMARY;
  }, [wrappedAccount]);

  return accountSummary;
}
