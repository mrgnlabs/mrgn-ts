import { useCallback } from "react";
import { useMarginfiAccount, useUserBalances, useUserStakeAccounts } from "../react-query";
import { UseMarginfiAccountOpts } from "../react-query/use-user.hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletAddress } from "../../context/wallet-state.context";

/**
 * Returns a single callback that refetches user state, with optional targeted cache invalidation.
 */
export function useRefreshUserData(accountOpts?: UseMarginfiAccountOpts) {
  const queryClient = useQueryClient();
  const address = useWalletAddress();
  const { refetch: refetchAccount } = useMarginfiAccount(accountOpts);
  const { refetch: refetchBalances } = useUserBalances();
  const { refetch: refetchStakeAccounts } = useUserStakeAccounts();

  /**
   * @param options - Optional object for targeted cache invalidation
   *   - clearStakeAccountsCache: boolean (default false)
   */
  const refresh = useCallback(
    (options?: { clearStakeAccountsCache?: boolean }) => {
      if (options?.clearStakeAccountsCache) {
        queryClient.invalidateQueries({ queryKey: ["userStakeAccounts", address?.toBase58()] });
      }
      // Add more cache keys here as needed in the future
      refetchAccount();
      refetchBalances();
      refetchStakeAccounts();
    },
    [refetchAccount, refetchBalances, queryClient, address, refetchStakeAccounts]
  );

  return refresh;
}
