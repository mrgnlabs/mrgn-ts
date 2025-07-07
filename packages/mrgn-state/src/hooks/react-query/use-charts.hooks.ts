import { useQuery } from "@tanstack/react-query";
import { fetchBankRates } from "../../api";
import { ExtendedBankInfo, StakePoolMetadata } from "../../types";

export function useBankChart(
  bankAddress: string,
  bank?: ExtendedBankInfo,
  stakepoolMetadataMap?: Map<string, StakePoolMetadata>
) {
  return useQuery({
    queryKey: ["bankChart", bankAddress],
    queryFn: () => fetchBankRates(bankAddress, bank, stakepoolMetadataMap),
    staleTime: 5 * 60_000, // 5 minutes
    retry: 2,
  });
}
