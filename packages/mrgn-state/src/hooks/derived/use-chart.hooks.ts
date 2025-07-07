import { useMemo } from "react";
import { transformInterestData, transformTotalInterestData } from "../../lib/chart.utils";
import { useInterestData } from "../react-query/use-interest.hooks";
import { usePortfolioData } from "../react-query/use-portfolio.hooks";
import { InterestChartResult, PortfolioChartResult } from "../../types";
import { InterestChartDataPoint } from "../../types/interest.types";
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
  const { data: interestData, error, isLoading, isError } = useInterestData(selectedAccount);

  const { chartData, bankSymbols: initialBankSymbols } = useMemo(() => {
    if (isLoading || isError || !interestData.length) {
      return { chartData: [], bankSymbols: [] };
    }

    if (dataType === "total") {
      return transformTotalInterestData(interestData);
    }

    return transformInterestData(interestData, dataType);
  }, [interestData, dataType, isLoading, isError]);

  const { filteredData, filteredBankSymbols } = useMemo(() => {
    if (!chartData.length) {
      return { filteredData: [], filteredBankSymbols: [] };
    }

    const keys = Object.keys(chartData[0]).filter((k) => k !== "timestamp");

    const keysToKeep = keys.filter((key) => chartData.some((entry) => Math.abs(entry[key] as number) >= 0.0001));

    const filteredData = chartData.map((entry) => {
      const filtered: InterestChartDataPoint = { timestamp: entry.timestamp };
      for (const key of keysToKeep) {
        filtered[key] = entry[key];
      }
      return filtered;
    });

    return {
      filteredData,
      filteredBankSymbols: initialBankSymbols.filter((symbol) => keysToKeep.includes(symbol)),
    };
  }, [chartData, initialBankSymbols]);

  return {
    data: filteredData,
    bankSymbols: filteredBankSymbols,
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
  const { data: portfolioData, error, isLoading, isError } = usePortfolioData(selectedAccount, banks);

  // Transform data based on variant
  const { data, bankSymbols } = useMemo(() => {
    if (isLoading || !portfolioData || Object.keys(portfolioData).length === 0) {
      return { data: [], bankSymbols: [] };
    }

    // Get all timestamps (sorted chronologically)
    const timestamps = Object.keys(portfolioData).sort();

    if (timestamps.length === 0) {
      return { data: [], bankSymbols: [] };
    }

    if (variant === "net") {
      // For net view, we aggregate the total net value across all assets at each timestamp
      const chartData = timestamps.map((timestamp) => {
        const positions = portfolioData[timestamp];
        const netValue = positions.reduce((sum, position) => sum + position.netValueUsd, 0);

        return {
          timestamp: timestamp,
          "Net Portfolio": netValue,
          net: netValue, // Keep both for backward compatibility
        };
      });

      return { data: chartData, bankSymbols: ["Net Portfolio"] };
    } else {
      // For deposits or borrows view, we need to track each bank separately
      const bankMap = new Map<string, boolean>(); // Track active banks

      // First pass - identify all active banks that have deposits or borrows
      timestamps.forEach((timestamp) => {
        portfolioData[timestamp].forEach((position) => {
          if (variant === "deposits" && position.depositValueUsd > 0) {
            bankMap.set(position.bankSymbol, true);
          } else if (variant === "borrows" && position.borrowValueUsd > 0) {
            bankMap.set(position.bankSymbol, true);
          }
        });
      });

      // Get all active bank symbols
      const activeBankSymbols = Array.from(bankMap.keys());

      // Create chart data points for each timestamp
      const chartData = timestamps.map((timestamp) => {
        const positions = portfolioData[timestamp];
        const dataPoint: Record<string, any> = { timestamp };

        // Initialize all active banks with zero values
        activeBankSymbols.forEach((symbol) => {
          dataPoint[symbol] = 0;
        });

        // Add values for banks that exist in this snapshot
        positions.forEach((position) => {
          if (variant === "deposits" && bankMap.has(position.bankSymbol)) {
            dataPoint[position.bankSymbol] = position.depositValueUsd;
          } else if (variant === "borrows" && bankMap.has(position.bankSymbol)) {
            dataPoint[position.bankSymbol] = position.borrowValueUsd;
          }
        });

        return dataPoint;
      });

      return { data: chartData, bankSymbols: activeBankSymbols };
    }
  }, [portfolioData, variant, isLoading]);

  return {
    data,
    bankSymbols,
    error,
    isLoading,
    isError,
  };
}
