"use client";

import React from "react";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { usePortfolioData, EnrichedPortfolioDataPoint } from "./use-portfolio-data.hook";

interface ChartDataPoint {
  timestamp: string;
  [bankSymbol: string]: number | string;
}

interface UsePortfolioChartReturn {
  data: ChartDataPoint[] | null;
  bankSymbols: string[];
  error: Error | null;
  isLoading: boolean;
}

// Transform API data into total portfolio format (deposits + borrows + net)
const transformTotalPortfolioData = (
  filledDailyTotals: Record<string, { deposits: number; borrows: number }>
): { chartData: ChartDataPoint[]; bankSymbols: string[] } => {
  if (!filledDailyTotals || Object.keys(filledDailyTotals).length === 0) {
    return { chartData: [], bankSymbols: [] };
  }

  // Use the gap-filled daily totals directly from the data hook
  const sortedDates = Object.keys(filledDailyTotals).sort();

  // Convert to chart format
  const chartData: ChartDataPoint[] = sortedDates.map((dateStr) => {
    const totals = filledDailyTotals[dateStr];
    const netValue = totals.deposits - totals.borrows;

    return {
      timestamp: `${dateStr}T12:00:00.000Z`,
      "Total Deposits": totals.deposits,
      "Total Borrows": -totals.borrows, // Make borrows negative for display below 0
      "Net Portfolio": netValue,
    };
  });

  // Check if we have any meaningful data (threshold of $0.01)
  const hasSignificantData = chartData.some(
    (point) => Math.abs(point["Total Deposits"] as number) > 0.01 || Math.abs(point["Total Borrows"] as number) > 0.01
  );

  if (!hasSignificantData) {
    return { chartData: [], bankSymbols: [] };
  }

  return {
    chartData,
    bankSymbols: ["Total Deposits", "Total Borrows", "Net Portfolio"],
  };
};

// Transform per-bank data for deposits/borrows variants using processed data from data hook
const transformBankPortfolioData = (
  filledBankData: Record<string, Record<string, { deposits: number; borrows: number }>>,
  variant: "deposits" | "borrows"
): { chartData: ChartDataPoint[]; bankSymbols: string[] } => {
  if (!filledBankData || Object.keys(filledBankData).length === 0) {
    return { chartData: [], bankSymbols: [] };
  }

  // Filter banks that have significant activity for this variant
  const activeBankSymbols = Object.keys(filledBankData).filter((bankSymbol) => {
    const bankDates = filledBankData[bankSymbol];
    return Object.values(bankDates).some((dayData) => {
      switch (variant) {
        case "deposits":
          return Math.abs(dayData.deposits) > 0.01;
        case "borrows":
          return Math.abs(dayData.borrows) > 0.01;
        default:
          return false;
      }
    });
  });

  if (activeBankSymbols.length === 0) {
    return { chartData: [], bankSymbols: [] };
  }

  // Get all dates from the first bank (they should all have the same dates due to gap-filling)
  const firstBankSymbol = activeBankSymbols[0];
  const allDates = Object.keys(filledBankData[firstBankSymbol]).sort();

  // Convert to chart format using the processed data directly
  const chartData: ChartDataPoint[] = allDates.map((dateStr) => {
    const dataPoint: ChartDataPoint = {
      timestamp: `${dateStr}T12:00:00.000Z`,
    };

    activeBankSymbols.forEach((bankSymbol) => {
      const dayData = filledBankData[bankSymbol][dateStr];
      if (dayData) {
        switch (variant) {
          case "deposits":
            dataPoint[bankSymbol] = dayData.deposits;
            break;
          case "borrows":
            dataPoint[bankSymbol] = dayData.borrows;
            break;
        }
      } else {
        dataPoint[bankSymbol] = 0;
      }
    });

    return dataPoint;
  });

  return { chartData, bankSymbols: activeBankSymbols };
};

const usePortfolioChart = (
  selectedAccount: string | null,
  variant: "deposits" | "borrows" | "net",
  banks: ExtendedBankInfo[]
): UsePortfolioChartReturn => {
  // Use the data hook for fetching and enriching portfolio data
  const {
    data: portfolioData,
    filledDailyTotals,
    filledBankData,
    error: dataError,
    isLoading: dataLoading,
  } = usePortfolioData(selectedAccount, banks);

  const [data, setData] = React.useState<ChartDataPoint[] | null>(null);
  const [bankSymbols, setBankSymbols] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (dataLoading || dataError || !portfolioData.length) {
      setData(null);
      setBankSymbols([]);
      return;
    }

    // For net variant, use the gap-filled daily totals directly
    if (variant === "net") {
      const { chartData, bankSymbols: symbols } = transformTotalPortfolioData(filledDailyTotals);
      setData(chartData);
      setBankSymbols(symbols);
      return;
    }

    // Transform per-bank data for deposits/borrows variants using processed data from data hook
    const { chartData, bankSymbols: symbols } = transformBankPortfolioData(
      filledBankData,
      variant as "deposits" | "borrows"
    );

    setData(chartData);
    setBankSymbols(symbols);
  }, [portfolioData, filledDailyTotals, filledBankData, banks, variant, dataLoading, dataError]);

  return {
    data,
    bankSymbols,
    error: dataError,
    isLoading: dataLoading,
  };
};

export { usePortfolioChart, type UsePortfolioChartReturn, type ChartDataPoint };
