import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { MarginfiAccountType } from "@mrgnlabs/marginfi-client-v2";
import { fetchMarginfiAccount, fetchMarginfiAccountAddresses, fetchUserBalances } from "../../api/user-api";
import { useRawBanks, useMetadata, useOracleData, useMintData } from ".";
import { TokenAccount } from "../../types";
import { useWalletAddress } from "../../context/wallet-state.context";
import { useSelectedAccount } from "../../context/selected-account.context";

export function useMarginfiAccountAddresses() {
  const authority = useWalletAddress();

  return useQuery<PublicKey[], Error>({
    queryKey: ["marginfiAccountAddresses", authority?.toBase58() ?? null],
    queryFn: () => {
      if (!authority) {
        throw new Error("Authority is required to fetch account addresses");
      }
      return fetchMarginfiAccountAddresses(authority);
    },
    enabled: Boolean(authority),
    staleTime: 10 * 60_000, // 10 minutes
    retry: 1,
  });
}

export type UseMarginfiAccountOpts = {
  overrideAccount?: PublicKey;
};

export function useMarginfiAccount(opts?: UseMarginfiAccountOpts) {
  const authority = useWalletAddress();

  const { data: rawBanks, isSuccess: isSuccessRawBanks, isError: isErrorRawBanks } = useRawBanks();
  const { data: metadata, isSuccess: isSuccessMetadata, isError: isErrorMetadata } = useMetadata();
  const { data: oracleData, isSuccess: isSuccessOracleData, isError: isErrorOracleData } = useOracleData();

  const { selectedAccountKey } = useSelectedAccount();

  // Debug logging for selectedAccountKey changes
  // Check if any of the dependencies have errors
  const hasErrors = isErrorRawBanks || isErrorMetadata || isErrorOracleData;

  // Check if all required data is available
  const allDataReady = isSuccessMetadata && isSuccessOracleData && isSuccessRawBanks;

  const queryEnabled = allDataReady && !hasErrors && Boolean(selectedAccountKey);

  return useQuery<MarginfiAccountType | null, Error>({
    queryKey: ["marginfiAccount", authority?.toBase58() ?? null, selectedAccountKey ?? null],
    queryFn: async () => {
      console.log("🔍 useMarginfiAccount queryFn - executing with:", {
        authority: authority?.toBase58(),
        selectedAccount: selectedAccountKey ?? null,
        hasRawBanks: Boolean(rawBanks),
        hasOracleData: Boolean(oracleData?.pythFeedIdMap),
        hasMetadata: Boolean(metadata?.bankMetadataMap),
      });

      if (!rawBanks || !oracleData?.pythFeedIdMap || !oracleData?.oracleMap || !metadata?.bankMetadataMap) {
        throw new Error("Required data not available for fetching MarginFi account");
      }

      const result = await fetchMarginfiAccount(
        rawBanks,
        oracleData.pythFeedIdMap,
        oracleData.oracleMap,
        metadata.bankMetadataMap,
        authority ? new PublicKey(authority) : undefined,
        selectedAccountKey ? new PublicKey(selectedAccountKey) : undefined
      );

      return result;
    },
    enabled: queryEnabled,
    staleTime: 2 * 60_000, // 2 minutes
    // refetchInterval: 60_000, // Temporarily disabled for performance
    retry: (failureCount, error) => {
      console.log("🔄 useMarginfiAccount retry attempt:", failureCount, "error:", error.message);
      // Don't retry if we have dependency errors
      if (hasErrors) return false;
      // Only retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

export function useUserBalances() {
  const authority = useWalletAddress();
  const { data: mintData, isSuccess: isSuccesMintData, isError: isErrorMintData } = useMintData();

  return useQuery<{ nativeSolBalance: number; ataList: TokenAccount[] }, Error>({
    queryKey: ["userBalance", authority?.toBase58() ?? null],
    queryFn: async () => {
      if (!mintData) {
        throw new Error("Required data not available for fetching user balances");
      }
      return await fetchUserBalances(mintData, authority);
    },
    enabled: isSuccesMintData && !isErrorMintData,
    staleTime: 2 * 60_000, // 2 minutes
    // refetchInterval: 60_000, // Temporarily disabled for performance
    retry: (failureCount, error) => {
      // Don't retry if we have dependency errors
      if (isErrorMintData) return false;
      // Only retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}
