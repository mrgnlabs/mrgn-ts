import { useQuery } from "@tanstack/react-query";
import { fetchInterestData } from "../../api";
import { InterestDataResult } from "../../types";
import { calculateLatestNetInterest, calculateNetInterest30dStats } from "../../lib";

/**
 * React Query hook for fetching interest data
 * @param selectedAccount The wallet address to fetch interest data for
 * @returns Interest data with statistics
 */
export function useInterestData(selectedAccount: string | null): InterestDataResult {
  const { data, error, isLoading, isError } = useQuery({
    queryKey: ["interestData", selectedAccount],
    queryFn: () => fetchInterestData(selectedAccount),
    staleTime: 5 * 60_000, // 5 minutes
    retry: 2,
    enabled: !!selectedAccount,
  });

  // Calculate latest net interest
  const latestNetInterest = data ? calculateLatestNetInterest(data) : 0;

  // Calculate net interest change across actual data range
  const netInterest30d = data
    ? calculateNetInterest30dStats(data)
    : {
        value: 0,
        change: 0,
        changePercent: 0,
      };

  return {
    data: data || [],
    latestNetInterest,
    netInterest30d,
    error: error as Error | null,
    isLoading,
    isError,
  };
}
