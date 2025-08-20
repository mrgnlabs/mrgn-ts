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
  const { data: portfolioData, error, isLoading, isError } = usePortfolioData(selectedAccount);

  // Transform data based on variant using P0's transformation logic
  const { data, bankSymbols } = useMemo(() => {
    if (isLoading || !portfolioData || Object.keys(portfolioData).length === 0) {
      return { data: [], bankSymbols: [] };
    }

    if (variant === "net") {
      // For net view, aggregate total net value across all assets at each timestamp
      // Adapted from P0's transformPortfolioDataToChart
      const timestamps = Object.keys(portfolioData).sort();

      const chartData = timestamps.map((timestamp) => {
        const timestampData = portfolioData[timestamp];
        const positions: Array<{ netValueUsd: number }> = [];

        if (Array.isArray(timestampData)) {
          for (const mintData of timestampData) {
            if (mintData && typeof mintData.netValueUsd === "number") {
              positions.push({ netValueUsd: mintData.netValueUsd });
            }
          }
        }

        const netValue = positions.reduce((sum, position) => sum + position.netValueUsd, 0);

        return {
          timestamp: timestamp,
          "Portfolio Balance": netValue,
          net: netValue, // Keep both for backward compatibility
        };
      });

      return { data: chartData, bankSymbols: ["Portfolio Balance"] };
    } else {
      // For deposits or borrows view, use P0's transformPortfolioDataToMultiLine logic
      const valueKey = variant === "deposits" ? "depositValueUsd" : "borrowValueUsd";

      // First pass - identify all active banks that have deposits or borrows
      const activeBankMap = new Map<string, boolean>();
      Object.values(portfolioData).forEach((positions) => {
        positions.forEach((position) => {
          if ((position[valueKey] || 0) > 0) {
            activeBankMap.set(position.bank_symbol, true);
          }
        });
      });

      const bankSymbols = Array.from(activeBankMap.keys()).sort();

      // Create chart data points for each timestamp
      const chartData = Object.entries(portfolioData)
        .map(([timestamp, positions]) => {
          const dataPoint: Record<string, any> = { timestamp };

          // Initialize all active banks with zero values
          bankSymbols.forEach((bank) => {
            dataPoint[bank] = 0;
          });

          // Add values for banks that exist in this snapshot
          positions.forEach((position) => {
            dataPoint[position.bank_symbol] = position[valueKey] || 0;
          });

          return dataPoint;
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return { data: chartData, bankSymbols };
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
