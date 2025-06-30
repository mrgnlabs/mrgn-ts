import { useMemo } from "react";
import {
  transformInterestData,
  transformTotalInterestData,
  transformBankPortfolioData,
  forwardFillDataToCurrentDate,
} from "../../lib/chart.utils";
import { useInterestData } from "../react-query/use-interest.hooks";
import { usePortfolioData } from "../react-query/use-portfolio.hooks";
import { InterestChartResult, PortfolioChartResult } from "../../types";
import type { ExtendedBankInfo } from "../../types/bank.types";

/**
 * React Query hook for interest chart data
 * @param selectedAccount The wallet address to fetch interest data for
 * @param dataType Type of interest data to display (earned, paid, or total)
 * @returns Chart-ready data and bank symbols
 */
export function useInterestChart(
  selectedAccount: string | null,
  dataType: "earned" | "paid" | "total"
): InterestChartResult {
  // Use the data hook for fetching interest data
  const { data: interestData, error, isLoading, isError } = useInterestData(selectedAccount);

  // Transform data into chart format based on type
  const { chartData, bankSymbols } = useMemo(() => {
    if (isLoading || isError || !interestData.length) {
      return { chartData: [], bankSymbols: [] };
    }

    if (dataType === "total") {
      return transformTotalInterestData(interestData);
    }

    return transformInterestData(interestData, dataType);
  }, [interestData, dataType, isLoading, isError]);

  return {
    data: chartData,
    bankSymbols,
    error,
    isLoading,
    isError,
  };
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
  const {
    data: portfolioData,
    filledDailyTotals,
    filledBankData,
    error,
    isLoading,
    isError,
  } = usePortfolioData(selectedAccount, banks);

  // Transform data based on variant
  const { data, bankSymbols } = useMemo(() => {
    if (isLoading || !portfolioData || portfolioData.length === 0) {
      return { data: [], bankSymbols: [] };
    }


    if (variant === "net") {
      // For net chart, we need to ensure we have data for all dates including gaps
      // First, get all dates from the filled daily totals
      const allDates = Object.keys(filledDailyTotals).sort();
      
      if (allDates.length === 0) {
        return { data: [], bankSymbols: [] };
      }
      
      // Create a continuous array of dates from first to last date
      const firstDate = new Date(allDates[0]);
      const lastDate = new Date(allDates[allDates.length - 1]);
      const today = new Date();
      
      // Always extend to today
      const endDate = today > lastDate ? today : lastDate;
      
      // Generate all dates in range
      const continuousDates: string[] = [];
      const currentDate = new Date(firstDate);
      
      while (currentDate <= endDate) {
        continuousDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Create chart data with proper forward filling for ALL dates
      let lastNetValue = 0;
      
      const chartData = continuousDates.map(dateStr => {
        if (filledDailyTotals[dateStr]) {
          // Use actual data if available
          const totals = filledDailyTotals[dateStr];
          const netValue = totals.net !== undefined ? totals.net : totals.deposits - totals.borrows;
          lastNetValue = netValue;
          
          return {
            timestamp: dateStr,
            net: netValue,
            "Net Portfolio": netValue
          };
        } else {
          // Forward fill with last known value
          return {
            timestamp: dateStr,
            net: lastNetValue,
            "Net Portfolio": lastNetValue
          };
        }
      });
      
      return { data: chartData, bankSymbols: ["Net Portfolio"] };
    }

    const transformedData = transformBankPortfolioData(filledBankData, variant as "deposits" | "borrows");

    return transformedData;
  }, [portfolioData, filledDailyTotals, filledBankData, variant, isLoading]);

  return {
    data,
    bankSymbols,
    error,
    isLoading,
    isError,
  };
}
