"use client";

import React from "react";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

// Portfolio data types
interface PortfolioDataPoint {
  account_id: number;
  account_address: string;
  bank_address: string;
  bank_name: string;
  bank_symbol: string;
  bucket_start: string;
  bucket_end: string;
  asset_shares: number;
  liability_shares: number;
  price: number;
  deposit_value_usd: number;
  borrow_value_usd: number;
  net_value_usd: number;
}

interface EnrichedPortfolioDataPoint extends PortfolioDataPoint {
  bank_symbol: string; // Ensure this uses oracle data
  deposit_value_usd: number; // Recalculated with oracle prices
  borrow_value_usd: number; // Recalculated with oracle prices
  net_value_usd: number; // Recalculated with oracle prices
}

interface StatsData {
  value: number; // Current value
  change: number; // Absolute change over data range
  changePercent: number; // Percentage change over data range
}

interface UsePortfolioDataReturn {
  data: EnrichedPortfolioDataPoint[];
  filledDailyTotals: Record<string, { deposits: number; borrows: number }>; // Gap-filled daily totals for chart consistency
  filledBankData: Record<string, Record<string, { deposits: number; borrows: number }>>; // Gap-filled per-bank data
  supplied30d: StatsData; // Stats across actual data range
  borrowed30d: StatsData; // Stats across actual data range
  netValue30d: StatsData; // Stats across actual data range
  error: Error | null;
  isLoading: boolean;
}

// Fill gaps in daily totals within the actual data range (no artificial dates)
const fillDataGaps = (
  dailyTotals: Record<string, { deposits: number; borrows: number }>,
  overrideStartDate?: string,
  overrideEndDate?: string
): Record<string, { deposits: number; borrows: number }> => {
  const existingDates = Object.keys(dailyTotals).sort();

  if (existingDates.length === 0) {
    return {};
  }

  // Use override dates if provided (for consistent cross-bank date range)
  const firstDate = overrideStartDate || existingDates[0];
  const lastDate = overrideEndDate || existingDates[existingDates.length - 1];

  // Generate all dates between first and last date (inclusive)
  const startDateObj = new Date(firstDate);
  const endDateObj = new Date(lastDate);

  const allDates: string[] = [];
  const currentDate = new Date(startDateObj);

  while (currentDate <= endDateObj) {
    allDates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const filledTotals: Record<string, { deposits: number; borrows: number }> = {};

  // Forward-fill missing data with last known values (within actual date range only)
  let lastDeposits = 0;
  let lastBorrows = 0;

  allDates.forEach((dateStr) => {
    // Check if we have actual data for this date
    if (dailyTotals[dateStr]) {
      // Use actual data and update last known values
      filledTotals[dateStr] = dailyTotals[dateStr];
      lastDeposits = dailyTotals[dateStr].deposits;
      lastBorrows = dailyTotals[dateStr].borrows;
    } else {
      // No actual data for this date, use last known values (only within actual range)
      filledTotals[dateStr] = {
        deposits: lastDeposits,
        borrows: lastBorrows,
      };
    }
  });

  return filledTotals;
};

// Calculate portfolio statistics using actual data range
const calculatePortfolioStats = (
  data: EnrichedPortfolioDataPoint[]
): {
  supplied30d: StatsData;
  borrowed30d: StatsData;
  netValue30d: StatsData;
} => {
  if (!data.length) {
    const emptyStats: StatsData = { value: 0, change: 0, changePercent: 0 };
    return {
      supplied30d: emptyStats,
      borrowed30d: emptyStats,
      netValue30d: emptyStats,
    };
  }

  // Group by date and sum across banks (raw data)
  const rawDailyTotals: Record<string, { deposits: number; borrows: number }> = {};

  data.forEach((item) => {
    const date = item.bucket_start.split("T")[0]; // Get YYYY-MM-DD
    if (!rawDailyTotals[date]) {
      rawDailyTotals[date] = { deposits: 0, borrows: 0 };
    }
    rawDailyTotals[date].deposits += item.deposit_value_usd;
    rawDailyTotals[date].borrows += item.borrow_value_usd;
  });

  // Fill gaps within actual data range only
  const dailyTotals = fillDataGaps(rawDailyTotals);

  const sortedDates = Object.keys(dailyTotals).sort();
  if (sortedDates.length === 0) {
    const emptyStats: StatsData = { value: 0, change: 0, changePercent: 0 };
    return {
      supplied30d: emptyStats,
      borrowed30d: emptyStats,
      netValue30d: emptyStats,
    };
  }

  // Use actual first and last dates from the data
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  const firstValues = dailyTotals[firstDate];
  const lastValues = dailyTotals[lastDate];

  // Calculate supplied stats (last vs first)
  const suppliedChange = lastValues.deposits - firstValues.deposits;
  const suppliedChangePercent = firstValues.deposits !== 0 ? (suppliedChange / firstValues.deposits) * 100 : 0;

  // Calculate borrowed stats (last vs first)
  const borrowedChange = lastValues.borrows - firstValues.borrows;
  const borrowedChangePercent = firstValues.borrows !== 0 ? (borrowedChange / firstValues.borrows) * 100 : 0;

  // Calculate net value stats (last vs first)
  const firstNet = firstValues.deposits - firstValues.borrows;
  const lastNet = lastValues.deposits - lastValues.borrows;
  const netChange = lastNet - firstNet;
  const netChangePercent = firstNet !== 0 ? (netChange / Math.abs(firstNet)) * 100 : 0;

  return {
    supplied30d: {
      value: lastValues.deposits,
      change: suppliedChange,
      changePercent: suppliedChangePercent,
    },
    borrowed30d: {
      value: lastValues.borrows,
      change: borrowedChange,
      changePercent: borrowedChangePercent,
    },
    netValue30d: {
      value: lastNet,
      change: netChange,
      changePercent: netChangePercent,
    },
  };
};

const usePortfolioData = (selectedAccount: string | null, banks: ExtendedBankInfo[]): UsePortfolioDataReturn => {
  const [data, setData] = React.useState<EnrichedPortfolioDataPoint[]>([]);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!selectedAccount) {
        setIsLoading(false);
        setError(new Error("No account selected"));
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/user/portfolio?account=${selectedAccount}`);
        if (!response.ok) {
          throw new Error(`Error fetching portfolio data: ${response.statusText}`);
        }

        const result: PortfolioDataPoint[] = await response.json();

        // Create a map of bank addresses to bank info for quick lookup
        const bankMap = banks.reduce(
          (map, bank) => {
            map[bank.address.toBase58()] = bank;
            return map;
          },
          {} as Record<string, ExtendedBankInfo>
        );

        // Enrich data with oracle prices and proper USD calculations
        const enrichedData: EnrichedPortfolioDataPoint[] = result.map((item) => {
          const bank = bankMap[item.bank_address];
          const oraclePrice = bank?.info.oraclePrice.priceRealtime.price.toNumber() || 0;
          const mintDecimals = bank?.info.rawBank.mintDecimals || 0;

          // Convert shares to tokens by dividing by decimals, then multiply by price
          const assetTokens = item.asset_shares / 10 ** mintDecimals;
          const liabilityTokens = item.liability_shares / 10 ** mintDecimals;

          return {
            ...item,
            // Use oracle price with proper decimal conversion for USD calculations
            deposit_value_usd: assetTokens * oraclePrice,
            borrow_value_usd: liabilityTokens * oraclePrice,
            net_value_usd: (assetTokens - liabilityTokens) * oraclePrice,
            bank_symbol: bank?.meta.tokenSymbol || item.bank_symbol || "Unknown",
          };
        });

        setData(enrichedData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch portfolio data"));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, [selectedAccount, banks]);

  // Calculate portfolio statistics
  const stats = React.useMemo(() => calculatePortfolioStats(data), [data]);

  // Calculate gap-filled daily totals for chart (same as stats calculation)
  const filledDailyTotals = React.useMemo(() => {
    if (!data.length) return {};

    const dailyTotals: Record<string, { deposits: number; borrows: number }> = {};
    data.forEach((item) => {
      const date = item.bucket_start.split("T")[0];
      if (!dailyTotals[date]) {
        dailyTotals[date] = { deposits: 0, borrows: 0 };
      }
      dailyTotals[date].deposits += item.deposit_value_usd;
      dailyTotals[date].borrows += item.borrow_value_usd;
    });

    // Use the standard gap-filling (already uses correct date range for totals)
    return fillDataGaps(dailyTotals);
  }, [data]);

  // Calculate gap-filled per-bank data for individual charts
  const filledBankData = React.useMemo(() => {
    if (!data.length) return {};

    // Get unique bank symbols
    const bankSymbols = Array.from(new Set(data.map((item) => item.bank_symbol)));

    // Find overall date range across ALL banks to ensure consistency
    const allDates = Array.from(new Set(data.map((item) => item.bucket_start.split("T")[0]))).sort();
    const overallStartDate = allDates[0];
    const overallEndDate = allDates[allDates.length - 1];

    const bankData: Record<string, Record<string, { deposits: number; borrows: number }>> = {};

    // Process each bank separately
    bankSymbols.forEach((bankSymbol) => {
      const bankItems = data.filter((item) => item.bank_symbol === bankSymbol);

      // Create daily totals for this bank
      const bankDailyTotals: Record<string, { deposits: number; borrows: number }> = {};
      bankItems.forEach((item) => {
        const date = item.bucket_start.split("T")[0];
        if (!bankDailyTotals[date]) {
          bankDailyTotals[date] = { deposits: 0, borrows: 0 };
        }
        bankDailyTotals[date].deposits += item.deposit_value_usd;
        bankDailyTotals[date].borrows += item.borrow_value_usd;
      });

      // Fill gaps for this bank using the OVERALL date range for consistency
      bankData[bankSymbol] = fillDataGaps(bankDailyTotals, overallStartDate, overallEndDate);
    });

    return bankData;
  }, [data]);

  return {
    data,
    filledDailyTotals,
    filledBankData,
    supplied30d: stats.supplied30d,
    borrowed30d: stats.borrowed30d,
    netValue30d: stats.netValue30d,
    error,
    isLoading,
  };
};

export { usePortfolioData, type UsePortfolioDataReturn, type EnrichedPortfolioDataPoint, type StatsData };
