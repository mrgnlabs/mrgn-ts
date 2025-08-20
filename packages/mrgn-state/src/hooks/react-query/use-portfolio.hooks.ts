import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPortfolioData } from "../../api";
import { calculate7dPortfolioStats, normalizePortfolioSnapshots } from "../../lib";
import { EnrichedPortfolioDataPoint, PortfolioDataResult, PositionType } from "../../types";
import type { ExtendedBankInfo } from "../../types/bank.types";

/**
 * React Query hook for fetching portfolio data
 * @param selectedAccount The wallet address to fetch portfolio data for
 * @param banks Array of ExtendedBankInfo objects for price data
 * @returns Portfolio data and statistics
 */
export function usePortfolioData(selectedAccount: string | null): PortfolioDataResult {
  const { data, error, isLoading, isError } = useQuery({
    queryKey: ["portfolioData", selectedAccount],
    queryFn: async () => {
      const data = await fetchPortfolioData(selectedAccount);
      return data;
    },
    staleTime: 5 * 60_000, // 5 minutes
    enabled: !!selectedAccount,
  });
  const stats = useMemo(() => {
    if (!data)
      return {
        supplied7d: { value: 0, change: 0, changePercent: 0 },
        borrowed7d: { value: 0, change: 0, changePercent: 0 },
        netValue7d: { value: 0, change: 0, changePercent: 0 },
      };
    return calculate7dPortfolioStats(data);
  }, [data]);

  return {
    data: data,
    supplied7d: stats.supplied7d,
    borrowed7d: stats.borrowed7d,
    netValue7d: stats.netValue7d,
    error: error as Error | null,
    isLoading,
    isError,
  };
}
