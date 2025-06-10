import { useQuery } from "@tanstack/react-query";
import { fetchRawBanks, BankRawDatas, fetchMintData, MintData } from "../../api";
import { PublicKey } from "@solana/web3.js";

export function useRawBanks(addresses: PublicKey[], groupAddress?: PublicKey) {
  return useQuery<BankRawDatas[], Error>({
    queryKey: ["rawBanks", addresses],
    queryFn: () => fetchRawBanks(addresses),
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useMintData(addresses: PublicKey[]) {
  return useQuery<MintData[], Error>({
    queryKey: ["mintData", addresses],
    queryFn: () => fetchMintData(addresses),
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: 1,
  });
}

// export function useOraclePrices(bankAddresses: PublicKey[]) {
//   return useQuery<OraclePrice[], Error>({
//     queryKey: ["oraclePrices", bankAddresses],
//     queryFn: () => fetchOraclePrices(bankAddresses),
//     staleTime: 60_000, // 1 minute
//     refetchInterval: 60_000,
//     retry: 1,
//   });
// }
