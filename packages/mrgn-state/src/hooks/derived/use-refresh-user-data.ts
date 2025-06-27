import { useCallback } from "react";
import { useMarginfiAccount, useUserBalances } from "../react-query";

/**
 * Returns a single callback that refetches user state
 */
export function useRefreshUserData() {
  const { refetch: refetchAccount } = useMarginfiAccount();
  const { refetch: refetchBalances } = useUserBalances();

  const refresh = useCallback(() => {
    refetchAccount();
    refetchBalances();
  }, [refetchAccount, refetchBalances]);

  return refresh;
}
