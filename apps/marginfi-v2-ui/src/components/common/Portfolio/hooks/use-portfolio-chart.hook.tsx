"use client";

import React, { useMemo } from "react";
import { ExtendedBankInfo, usePortfolioData } from "@mrgnlabs/mrgn-state";

export interface ChartDataPoint {
  timestamp: string;
  [bankSymbol: string]: number | string;
}

export interface UsePortfolioChartReturn {
  data: ChartDataPoint[];
  bankSymbols: string[];
  error: Error | null;
  isLoading: boolean;
}

/**
 * Transform bank portfolio data into chart format for deposits or borrows
 * @param bankData Per-bank daily totals
 * @param variant Which data to use (deposits or borrows)
 * @returns Chart data and bank symbols
 */
const transformBankPortfolioData = (
  bankData: Record<string, Record<string, { deposits: number; borrows: number }>>,
  variant: "deposits" | "borrows"
): { chartData: ChartDataPoint[]; bankSymbols: string[] } => {
  // Get all bank symbols and dates
  const allBankSymbols = Object.keys(bankData);
  if (allBankSymbols.length === 0) {
    return { chartData: [], bankSymbols: [] };
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
    return { chartData: [], bankSymbols: [] };
  }

  // Create chart data points with filtered banks for each date
  const chartData = allDates.map((date) => {
    const dataPoint: ChartDataPoint = { timestamp: date };
    
    // Add each filtered bank's value for this date
    filteredBankSymbols.forEach((symbol) => {
      const bankValues = bankData[symbol][date];
      dataPoint[symbol] = bankValues ? bankValues[variant] : 0;
    });
    
    return dataPoint;
  });

  return { chartData, bankSymbols: filteredBankSymbols };
};

/**
 * Hook for portfolio chart data using the new React Query implementation
 * This is a wrapper around the mrgn-state hook to maintain backward compatibility
 */
export const usePortfolioChart = (
  selectedAccount: string | null,
  variant: "deposits" | "borrows" | "net",
  banks: ExtendedBankInfo[]
): UsePortfolioChartReturn => {
  // Use the new React Query hook for portfolio data
  const { data: portfolioData, filledDailyTotals, filledBankData, error, isLoading } = usePortfolioData(
    selectedAccount,
    banks
  );

  // Transform data based on variant
  const { chartData, bankSymbols } = useMemo(() => {
    if (isLoading || !portfolioData || portfolioData.length === 0) {
      return { chartData: [], bankSymbols: [] };
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
      
      return { chartData, bankSymbols: ["net"] };
    }
    
    // For deposits or borrows, use the bank-specific data
    return transformBankPortfolioData(
      filledBankData,
      variant as "deposits" | "borrows"
    );
  }, [portfolioData, filledDailyTotals, filledBankData, variant, isLoading]);

  return {
    data: chartData,
    bankSymbols,
    error,
    isLoading,
  };
};
