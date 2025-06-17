import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { MarginfiAccountType } from "@mrgnlabs/marginfi-client-v2";
import { fetchMarginfiAccount, fetchMarginfiAccountAddresses } from "../../api/user-api";
import { useSelectedAccountKey } from "../session-storage";
import { useBanks } from "../derived";
import { useOracleData, useRawBanks } from "./use-banks.hooks";
import { useMetadata } from "./use-metadata.hooks";

export function useMarginfiAccountAddresses(authority: PublicKey | undefined) {
  return useQuery<PublicKey[], Error>({
    queryKey: ["marginfiAccountAddresses", authority?.toBase58() ?? null],
    queryFn: () => {
      if (!authority) {
        throw new Error("Authority is required to fetch account addresses");
      }
      return fetchMarginfiAccountAddresses(authority);
    },
    enabled: Boolean(authority),
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useMarginfiAccount(authority: PublicKey | undefined) {
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
  const allDataReady =
    Boolean(authority) && isSuccessAccountAddresses && isSuccessMetadata && isSuccessOracleData && isSuccessRawBanks;

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
    staleTime: 5_000, // 1 minute
    refetchInterval: 5_000,
    retry: (failureCount, error) => {
      // Don't retry if we have dependency errors
      if (hasErrors) return false;
      // Only retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}
