import { useQuery } from "@tanstack/react-query";
import { fetchBankRates } from "../../api";
import { ExtendedBankInfo, StakePoolMetadata, historicBankChartData } from "../../types";

export function useBankChart(
  bankAddress: string,
  bank?: ExtendedBankInfo,
  stakepoolMetadataMap?: Map<string, StakePoolMetadata>
) {
  return useQuery<historicBankChartData[]>({
    queryKey: ["bankChart", bankAddress],
    queryFn: () => fetchBankRates(bankAddress, bank, stakepoolMetadataMap),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 2,
  });
}
