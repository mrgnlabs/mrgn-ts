import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMarginfiAccount, useUserBalances } from "../react-query";

/**
 * Returns a single callback that refetches user state
 */
export function useRefreshUserData(authority?: PublicKey) {
  const { refetch: refetchAccount } = useMarginfiAccount(authority);
  const { refetch: refetchBalances } = useUserBalances(authority);

  const refresh = useCallback(() => {
    refetchAccount();
    refetchBalances();
  }, [refetchAccount, refetchBalances]);

  return refresh;
}
