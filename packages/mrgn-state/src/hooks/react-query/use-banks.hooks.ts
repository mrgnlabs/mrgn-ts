import { useQuery } from "@tanstack/react-query";
import { fetchRawBanks, BankRawDatas, fetchMintData, MintData, fetchOraclePrices } from "../../api";
import { PublicKey } from "@solana/web3.js";
import { OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { useMetadata } from "./use-metadata.hooks";

export function useRawBanks(groupAddress?: PublicKey) {
  const metadata = useMetadata();

  return useQuery<BankRawDatas[], Error>({
    queryKey: ["rawBanks"],
    queryFn: () => fetchRawBanks(metadata.data?.bankAddresses ?? []),
    enabled: metadata.isSuccess,
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useMintData() {
  const metadata = useMetadata();

  return useQuery<MintData[], Error>({
    queryKey: ["mintData"],
    queryFn: () => fetchMintData(metadata.data?.bankAddresses ?? []),
    enabled: metadata.isSuccess,
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: 1,
  });
}

export type OracleData = Awaited<ReturnType<typeof fetchOraclePrices>>;

export function useOracleData() {
  const metadata = useMetadata();
  const bankData = useRawBanks();

  return useQuery<OracleData, Error>({
    queryKey: ["oraclePrices"],
    queryFn: () => fetchOraclePrices(bankData.data ?? [], metadata.data?.bankMetadataMap ?? {}),
    enabled: bankData.isSuccess && metadata.isSuccess,
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: 1,
  });
}
