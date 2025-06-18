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
  change: number; // Absolute change over 7 days
  changePercent: number; // Percentage change over 7 days
}

interface UsePortfolioDataReturn {
  data: EnrichedPortfolioDataPoint[];
  supplied7d: StatsData;
  borrowed7d: StatsData;
  netValue7d: StatsData;
  error: Error | null;
  isLoading: boolean;
}

// Fill gaps in daily totals to extend to today (similar to chart logic)
const fillDataGaps = (
  dailyTotals: Record<string, { deposits: number; borrows: number }>
): Record<string, { deposits: number; borrows: number }> => {
  // Generate array of all dates for the last 30 days (to match chart)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29);

  const allDates: string[] = [];
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    allDates.push(currentDate.toISOString().split("T")[0]);
  }

  const filledTotals: Record<string, { deposits: number; borrows: number }> = {};

  // Initialize all dates with zero values
  allDates.forEach((dateStr) => {
    filledTotals[dateStr] = { deposits: 0, borrows: 0 };
  });

  // Populate with actual data where available
  Object.keys(dailyTotals).forEach((date) => {
    if (filledTotals[date] !== undefined) {
      filledTotals[date] = dailyTotals[date];
    }
  });

  // Forward-fill missing data with last known values
  let lastDeposits = 0;
  let lastBorrows = 0;

  allDates.forEach((dateStr) => {
    const current = filledTotals[dateStr];
    if (current.deposits > 0) {
      lastDeposits = current.deposits;
    }
    if (current.borrows > 0) {
      lastBorrows = current.borrows;
    }

    // Use actual values if available, otherwise use last known values
    filledTotals[dateStr] = {
      deposits: current.deposits > 0 ? current.deposits : lastDeposits,
      borrows: current.borrows > 0 ? current.borrows : lastBorrows,
    };
  });

  return filledTotals;
};

// Calculate 7-day portfolio statistics
const calculatePortfolioStats = (
  data: EnrichedPortfolioDataPoint[]
): {
  supplied7d: StatsData;
  borrowed7d: StatsData;
  netValue7d: StatsData;
} => {
  if (!data.length) {
    const emptyStats: StatsData = { value: 0, change: 0, changePercent: 0 };
    return {
      supplied7d: emptyStats,
      borrowed7d: emptyStats,
      netValue7d: emptyStats,
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

  // Fill gaps to extend data to today (like chart does)
  const dailyTotals = fillDataGaps(rawDailyTotals);

  const sortedDates = Object.keys(dailyTotals).sort();
  if (sortedDates.length === 0) {
    const emptyStats: StatsData = { value: 0, change: 0, changePercent: 0 };
    return {
      supplied7d: emptyStats,
      borrowed7d: emptyStats,
      netValue7d: emptyStats,
    };
  }

  // Get latest data point
  const latestDate = sortedDates[sortedDates.length - 1];
  const latest = dailyTotals[latestDate];

  // Calculate date 7 days ago
  const latestDateObj = new Date(latestDate);
  const sevenDaysAgoDateObj = new Date(latestDateObj);
  sevenDaysAgoDateObj.setDate(sevenDaysAgoDateObj.getDate() - 7);
  const sevenDaysAgoDateStr = sevenDaysAgoDateObj.toISOString().split("T")[0];

  // Find the closest data point to 7 days ago (should exist now due to gap filling)
  let sevenDaysAgo = latest; // Default to latest if no historical data
  let comparisonDate = latestDate;

  // Look for exact match first (should exist due to gap filling)
  if (dailyTotals[sevenDaysAgoDateStr]) {
    sevenDaysAgo = dailyTotals[sevenDaysAgoDateStr];
    comparisonDate = sevenDaysAgoDateStr;
  } else {
    // Find the closest date to 7 days ago
    let closestDate = latestDate;
    let minDiff = Infinity;

    for (const date of sortedDates) {
      const dateObj = new Date(date);
      const diff = Math.abs(dateObj.getTime() - sevenDaysAgoDateObj.getTime());
      if (diff < minDiff && dateObj <= sevenDaysAgoDateObj) {
        minDiff = diff;
        closestDate = date;
      }
    }

    sevenDaysAgo = dailyTotals[closestDate];
    comparisonDate = closestDate;
  }

  // Calculate supplied stats
  const suppliedChange = latest.deposits - sevenDaysAgo.deposits;
  const suppliedChangePercent = sevenDaysAgo.deposits !== 0 ? (suppliedChange / sevenDaysAgo.deposits) * 100 : 0;

  // Calculate borrowed stats
  const borrowedChange = latest.borrows - sevenDaysAgo.borrows;
  const borrowedChangePercent = sevenDaysAgo.borrows !== 0 ? (borrowedChange / sevenDaysAgo.borrows) * 100 : 0;

  // Calculate net value stats
  const latestNet = latest.deposits - latest.borrows;
  const sevenDaysAgoNet = sevenDaysAgo.deposits - sevenDaysAgo.borrows;
  const netChange = latestNet - sevenDaysAgoNet;
  const netChangePercent = sevenDaysAgoNet !== 0 ? (netChange / Math.abs(sevenDaysAgoNet)) * 100 : 0;

  return {
    supplied7d: {
      value: latest.deposits,
      change: suppliedChange,
      changePercent: suppliedChangePercent,
    },
    borrowed7d: {
      value: latest.borrows,
      change: borrowedChange,
      changePercent: borrowedChangePercent,
    },
    netValue7d: {
      value: latestNet,
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

  return {
    data,
    supplied7d: stats.supplied7d,
    borrowed7d: stats.borrowed7d,
    netValue7d: stats.netValue7d,
    error,
    isLoading,
  };
};

export { usePortfolioData, type UsePortfolioDataReturn, type EnrichedPortfolioDataPoint, type StatsData };
