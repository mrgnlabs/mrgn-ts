import { useQuery } from "@tanstack/react-query";
import { fetchRawBanks, BankRawDatas, fetchMintData, fetchOraclePrices, fetchEmissionPriceMap } from "../../api";
import { OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { useMetadata } from "./use-metadata.hooks";
import { RawMintData, TokenPriceMap } from "../../types";

export function useRawBanks() {
  const metadata = useMetadata();

  return useQuery<BankRawDatas[], Error>({
    queryKey: ["rawBanks"],
    queryFn: () => fetchRawBanks(metadata.data?.bankAddresses ?? []),
    enabled: metadata.isSuccess,
    staleTime: 0, // 1 minute
    refetchInterval: 0,
    retry: 2,
  });
}

export function useMintData() {
  const metadata = useMetadata();

  return useQuery<RawMintData[], Error>({
    queryKey: ["mintData"],
    queryFn: () => {
      if (!metadata.data) {
        throw new Error("Required data not available for fetching mint data");
      }

      const tokenAddresses = Object.values(metadata.data.bankMetadataMap).map((t) => t.tokenAddress);
      return fetchMintData(tokenAddresses);
    },
    enabled: metadata.isSuccess,
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: 2,
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
    staleTime: 30_000, // 1 minute
    refetchInterval: 30_000,
    retry: 1,
  });
}

export function useEmissionPriceMap() {
  const bankData = useRawBanks();

  return useQuery<TokenPriceMap, Error>({
    queryKey: ["emissionPriceMap"],
    queryFn: () => fetchEmissionPriceMap(bankData.data ?? []),
    enabled: bankData.isSuccess,
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: 1,
  });
}
