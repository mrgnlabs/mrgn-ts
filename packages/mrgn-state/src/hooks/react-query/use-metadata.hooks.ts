import { useQuery } from "@tanstack/react-query";
import { fetchMarginfiLuts, fetchMetaData } from "../../api/metadata-api";
import { AddressLookupTableAccount } from "@solana/web3.js";

export type AppMetadata = Awaited<ReturnType<typeof fetchMetaData>>;

export function useMetadata() {
  return useQuery<AppMetadata, Error>({
    queryKey: ["metadata"],
    queryFn: () => fetchMetaData(),
    staleTime: Infinity,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

export function useMarginfiLuts() {
  return useQuery<AddressLookupTableAccount[], Error>({
    queryKey: ["marginfiLuts"],
    queryFn: () => fetchMarginfiLuts(),
    staleTime: Infinity,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
