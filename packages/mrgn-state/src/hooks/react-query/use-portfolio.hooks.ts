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
 * Transform bank portfolio data into chart format for deposits or borrows
 * @param bankData Per-bank daily totals
 * @param variant Which data to use (deposits or borrows)
 * @returns Chart data and bank symbols
 */
function transformBankPortfolioData(
  bankData: Record<string, Record<string, { deposits: number; borrows: number }>>,
  variant: "deposits" | "borrows"
): { data: any[]; bankSymbols: string[] } {
  // Get all bank symbols and dates
  const allBankSymbols = Object.keys(bankData);
  if (allBankSymbols.length === 0) {
    return { data: [], bankSymbols: [] };
  }

  // Get all dates from the first bank (all banks should have the same date range)
  const firstBank = allBankSymbols[0];
  const allDates = Object.keys(bankData[firstBank]).sort();
  
  // Filter out banks that have all zero values for the selected variant
  const filteredBankSymbols = allBankSymbols.filter(symbol => {
    // Check if this bank has any non-zero values for the selected variant
    return Object.values(bankData[symbol]).some(dayData => {
      return dayData[variant] > 0;
    });
  });
  
  // If no banks have non-zero values, return empty data
  if (filteredBankSymbols.length === 0) {
    return { data: [], bankSymbols: [] };
  }

  // Create chart data points with filtered banks for each date
  const chartData = allDates.map((date) => {
    const dataPoint: any = { timestamp: date };
    
    // Add each filtered bank's value for this date
    filteredBankSymbols.forEach((symbol) => {
      const bankValues = bankData[symbol][date];
      dataPoint[symbol] = bankValues ? bankValues[variant] : 0;
    });
    
    return dataPoint;
  });

  return { data: chartData, bankSymbols: filteredBankSymbols };
}

/**
 * React Query hook for transforming portfolio data into chart format
 * @param selectedAccount The wallet address to fetch portfolio data for
 * @param banks Array of ExtendedBankInfo objects for price data
 * @param variant Type of portfolio data to display (deposits, borrows, or net)
 * @returns Chart-ready portfolio data with bank symbols
 */
export function usePortfolioChart(
  selectedAccount: string | null,
  banks: ExtendedBankInfo[],
  variant: "deposits" | "borrows" | "net" = "net"
): PortfolioChartResult {
  const { data: portfolioData, filledDailyTotals, filledBankData, error, isLoading, isError } = usePortfolioData(selectedAccount, banks);

  // Transform data based on variant
  const { data, bankSymbols } = useMemo(() => {
    if (isLoading || !portfolioData || portfolioData.length === 0) {
      return { data: [], bankSymbols: [] };
    }

    // For the "net" variant, we use the total portfolio data
    if (variant === "net") {
      // Convert the filled daily totals to chart format
      const sortedDates = Object.keys(filledDailyTotals).sort();
      const chartData = sortedDates.map((dateStr) => {
        const totals = filledDailyTotals[dateStr];
        const netValue = totals.deposits - totals.borrows;
        
        return {
          timestamp: dateStr,
          net: netValue
        };
      });
      
      return { data: chartData, bankSymbols: ["net"] };
    }
    
    // For deposits or borrows, use the bank-specific data
    return transformBankPortfolioData(
      filledBankData,
      variant as "deposits" | "borrows"
    );
  }, [portfolioData, filledDailyTotals, filledBankData, variant, isLoading]);

  return {
    data,
    bankSymbols,
    error,
    isLoading,
    isError,
  };
}
