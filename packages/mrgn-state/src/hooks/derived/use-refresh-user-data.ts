import { useCallback } from "react";
import { useMarginfiAccount, useUserBalances } from "../react-query";
import { UseMarginfiAccountOpts } from "../react-query/use-user.hooks";

/**
 * Returns a single callback that refetches user state
 */
export function useRefreshUserData(accountOpts?: UseMarginfiAccountOpts) {
  const { refetch: refetchAccount } = useMarginfiAccount(accountOpts);
  const { refetch: refetchBalances } = useUserBalances();

  const refresh = useCallback(() => {
    refetchAccount();
    refetchBalances();
  }, [refetchAccount, refetchBalances]);

  return refresh;
}
