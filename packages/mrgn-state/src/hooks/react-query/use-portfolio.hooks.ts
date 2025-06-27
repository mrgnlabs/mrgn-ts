import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPortfolioData } from "../../api";
import { 
  calculatePortfolioStats, 
  calculateDailyTotals, 
  calculatePerBankDailyTotals,
  transformPortfolioDataToChartFormat 
} from "../../lib";
import { PortfolioChartResult, PortfolioDataResult } from "../../types";
import type { ExtendedBankInfo } from "../../types/bank.types";

/**
 * React Query hook for fetching portfolio data
 * @param selectedAccount The wallet address to fetch portfolio data for
 * @param banks Array of ExtendedBankInfo objects for price data
 * @returns Portfolio data and statistics
 */
export function usePortfolioData(
  selectedAccount: string | null,
  banks: ExtendedBankInfo[]
): PortfolioDataResult {
  const { data, error, isLoading, isError } = useQuery({
    queryKey: ["portfolioData", selectedAccount],
    queryFn: () => fetchPortfolioData(selectedAccount, banks),
    staleTime: 5 * 60_000, // 5 minutes
    enabled: !!selectedAccount && banks.length > 0,
  });

  // Calculate portfolio statistics using utility function
  const stats = useMemo(() => calculatePortfolioStats(data || []), [data]);

  // Calculate gap-filled daily totals using utility function
  const filledDailyTotals = useMemo(() => {
    if (!data?.length) return {};
    const dailyTotals = calculateDailyTotals(data);
    return dailyTotals;
  }, [data]);

  // Calculate gap-filled per-bank data using utility function
  const filledBankData = useMemo(() => {
    if (!data?.length) return {};
    return calculatePerBankDailyTotals(data);
  }, [data]);

  return {
    data: data || [],
    filledDailyTotals,
    filledBankData,
    supplied30d: stats.supplied30d,
    borrowed30d: stats.borrowed30d,
    netValue30d: stats.netValue30d,
    error: error as Error | null,
    isLoading,
    isError,
  };
}

/**
 * React Query hook for transforming portfolio data into chart format
 * @param selectedAccount The wallet address to fetch portfolio data for
 * @param banks Array of ExtendedBankInfo objects for price data
 * @returns Chart-ready portfolio data
 */
export function usePortfolioChart(
  selectedAccount: string | null,
  banks: ExtendedBankInfo[]
): PortfolioChartResult {
  const { data: portfolioData, filledDailyTotals, error, isLoading, isError } = usePortfolioData(selectedAccount, banks);

  // Transform data into chart format using utility function
  const data = useMemo(() => {
    if (!portfolioData.length || !Object.keys(filledDailyTotals).length) {
      return [];
    }
    return transformPortfolioDataToChartFormat(filledDailyTotals);
  }, [portfolioData, filledDailyTotals]);

  return {
    data,
    error,
    isLoading,
    isError,
  };
}
