import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { MarginfiAccountType } from "@mrgnlabs/marginfi-client-v2";
import { fetchMarginfiAccount, fetchMarginfiAccountAddresses, fetchUserBalances } from "../../api/user-api";
import { useRawBanks, useMetadata, useOracleData, useMintData } from ".";
import { useSelectedAccountKey } from "../session-storage";
import { TokenAccount } from "../../types";
import { useWalletAddress } from "../../context/wallet-context";

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

export function useMarginfiAccount() {
  const authority = useWalletAddress();

  const {
    data: accountAddresses,
    isSuccess: isSuccessAccountAddresses,
    isError: isErrorAccountAddresses,
  } = useMarginfiAccountAddresses();

  const { data: rawBanks, isSuccess: isSuccessRawBanks, isError: isErrorRawBanks } = useRawBanks();
  const { data: metadata, isSuccess: isSuccessMetadata, isError: isErrorMetadata } = useMetadata();
  const { data: oracleData, isSuccess: isSuccessOracleData, isError: isErrorOracleData } = useOracleData();

  const { selectedKey: selectedAccountKey } = useSelectedAccountKey(accountAddresses);

  // Debug logging for selectedAccountKey changes
  console.log("🔍 useMarginfiAccount - selectedAccountKey:", selectedAccountKey);
  console.log(
    "🔍 useMarginfiAccount - accountAddresses:",
    accountAddresses?.map((k) => k.toBase58())
  );

  console.log("🔍 authority:", authority?.toBase58());

  // Check if any of the dependencies have errors
  const hasErrors = isErrorAccountAddresses || isErrorRawBanks || isErrorMetadata || isErrorOracleData;

  // Check if all required data is available
  const allDataReady = isSuccessAccountAddresses && isSuccessMetadata && isSuccessOracleData && isSuccessRawBanks;

  const queryEnabled = allDataReady && !hasErrors && Boolean(selectedAccountKey);

  return useQuery<MarginfiAccountType | null, Error>({
    queryKey: ["marginfiAccount", authority?.toBase58() ?? null, selectedAccountKey ?? null],
    queryFn: async () => {
      console.log("🔍 useMarginfiAccount queryFn - executing with:", {
        authority: authority?.toBase58(),
        selectedAccountKey,
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
