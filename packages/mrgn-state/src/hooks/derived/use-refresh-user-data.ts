import { useCallback } from "react";
import { useMarginfiAccount, useUserBalances, useUserStakeAccounts } from "../react-query";
import { useMarginfiAccountAddresses } from "../react-query/use-user.hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletAddress } from "../../context/wallet-state.context";
import { useSelectedAccount } from "../../context";
import { PublicKey } from "@solana/web3.js";

/**
 * Returns a single callback that refetches user state, with optional targeted cache invalidation.
 */
export function useRefreshUserData() {
  const queryClient = useQueryClient();
  const address = useWalletAddress();
  const { setSelectedAccountKey } = useSelectedAccount();
  const { refetch: refetchAccount } = useMarginfiAccount();
  const { refetch: refetchBalances } = useUserBalances();
  const { refetch: refetchAddresses } = useMarginfiAccountAddresses();
  const { refetch: refetchStakeAccounts } = useUserStakeAccounts();

  /**
   * @param options - Optional object for targeted cache invalidation
   *   - clearStakeAccountsCache: boolean (default false)
   */
  const refresh = useCallback(
    async (options?: { clearStakeAccountsCache?: boolean; newAccountKey?: PublicKey }) => {
      if (options?.newAccountKey) {
        setSelectedAccountKey(options.newAccountKey.toBase58());
        refetchBalances();
      } else {
        refetchAccount();
        refetchBalances();
        refetchStakeAccounts();
      }
    },
    [refetchAccount, refetchBalances, queryClient, address, refetchStakeAccounts]
  );

  return refresh;
}
