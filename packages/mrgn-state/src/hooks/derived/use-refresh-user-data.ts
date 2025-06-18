import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMarginfiAccount, useUserBalances } from "../react-query";

/**
 * Returns a single callback that refetches user state
 */
export function useRefreshUserData(authority?: PublicKey) {
  const accountQ = useMarginfiAccount(authority);
  const balancesQ = useUserBalances(authority);

  const refresh = useCallback(() => {
    accountQ.refetch();
    balancesQ.refetch();
  }, [accountQ, balancesQ]);

  return refresh;
}
