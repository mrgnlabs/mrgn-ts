import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { MarginfiAccountType } from "@mrgnlabs/marginfi-client-v2";
import { fetchMarginfiAccount, fetchMarginfiAccountAddresses, fetchUserBalances } from "../../api/user-api";
import { useSelectedAccountKey } from "../session-storage";
import { useMintData, useOracleData, useRawBanks } from "./use-banks.hooks";
import { useMetadata } from "./use-metadata.hooks";
import { TokenAccount } from "../../types";

export function useMarginfiAccountAddresses(authority?: PublicKey) {
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

export function useMarginfiAccount(authority?: PublicKey) {
  const {
    data: accountAddresses,
    isSuccess: isSuccessAccountAddresses,
    isError: isErrorAccountAddresses,
  } = useMarginfiAccountAddresses(authority);

  const { data: rawBanks, isSuccess: isSuccessRawBanks, isError: isErrorRawBanks } = useRawBanks();
  const { data: metadata, isSuccess: isSuccessMetadata, isError: isErrorMetadata } = useMetadata();
  const { data: oracleData, isSuccess: isSuccessOracleData, isError: isErrorOracleData } = useOracleData();

  const { selectedKey: selectedAccountKey, setSelectedKey: setSelectedAccountKey } =
    useSelectedAccountKey(accountAddresses);

  // Check if any of the dependencies have errors
  const hasErrors = isErrorAccountAddresses || isErrorRawBanks || isErrorMetadata || isErrorOracleData;

  // Check if all required data is available
  const allDataReady = isSuccessAccountAddresses && isSuccessMetadata && isSuccessOracleData && isSuccessRawBanks;

  return useQuery<MarginfiAccountType | null, Error>({
    queryKey: ["marginfiAccount", authority?.toBase58() ?? null, selectedAccountKey ?? null],
    queryFn: async () => {
      if (!rawBanks || !oracleData?.pythFeedIdMap || !oracleData?.oracleMap || !metadata?.bankMetadataMap) {
        throw new Error("Required data not available for fetching MarginFi account");
      }

      return await fetchMarginfiAccount(
        rawBanks,
        oracleData.pythFeedIdMap,
        oracleData.oracleMap,
        metadata.bankMetadataMap,
        selectedAccountKey ? new PublicKey(selectedAccountKey) : undefined
      );
    },
    enabled: allDataReady && !hasErrors,
    staleTime: 2 * 60_000, // 2 minutes
    // refetchInterval: 60_000, // Temporarily disabled for performance
    retry: (failureCount, error) => {
      // Don't retry if we have dependency errors
      if (hasErrors) return false;
      // Only retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

export function useUserBalances(authority?: PublicKey) {
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
