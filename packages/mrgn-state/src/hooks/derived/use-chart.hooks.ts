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
      // Convert the filled daily totals to chart format
      const sortedDates = Object.keys(filledDailyTotals).sort();
      const chartData = sortedDates.map((dateStr) => {
        const totals = filledDailyTotals[dateStr];

        const netValue = totals.net !== undefined ? totals.net : totals.deposits - totals.borrows;


        return {
          timestamp: dateStr,
          net: netValue,
          "Net Portfolio": netValue,
        };
      });

      // Forward-fill net variant data to current date
      const forwardFilledData = forwardFillDataToCurrentDate(chartData, ["net"]);

      return { data: forwardFilledData, bankSymbols: ["Net Portfolio"] };
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
