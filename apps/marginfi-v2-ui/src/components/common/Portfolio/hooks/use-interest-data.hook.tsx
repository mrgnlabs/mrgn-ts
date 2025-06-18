"use client";

import React from "react";

// Interest earned data types
interface InterestEarnedDataPoint {
  account_id: number;
  account_address: string;
  bank_id: number;
  bank_address: string;
  bank_mint: string;
  mint_decimals: number;
  bank_snapshot_time: string;
  account_balance_snapshot_time: string;
  account_balance_id: number;
  bank_name: string;
  bank_symbol: string;
  asset_shares_normalized: number;
  liability_shares_normalized: number;
  current_deposit_value: number;
  current_debt_value: number;
  initial_asset_share_value: number;
  initial_liability_share_value: number;
  current_price_usd_close: number;
  current_price_timestamp_close: string;
  initial_deposit_value: number;
  initial_debt_value: number;
  interest_earned: number;
  interest_paid: number;
  current_deposit_value_usd_close: number;
  current_debt_value_usd_close: number;
  initial_deposit_value_usd_close: number;
  initial_debt_value_usd_close: number;
  interest_earned_usd_close: number;
  interest_paid_usd_close: number;
  past_positions_interest_earned: number;
  past_positions_interest_paid: number;
  past_positions_interest_earned_usd_close: number;
  past_positions_interest_paid_usd_close: number;
  cumulative_interest_earned: number;
  cumulative_interest_paid: number;
  cumulative_interest_earned_usd_close: number;
  cumulative_interest_paid_usd_close: number;
}

interface UseInterestDataReturn {
  data: InterestEarnedDataPoint[];
  latestNetInterest: number; // Latest net interest (earned - paid)
  netInterest30d: StatsData; // Change in net interest across actual data range
  error: Error | null;
  isLoading: boolean;
}

interface StatsData {
  value: number; // Current value
  change: number; // Absolute change over data range
  changePercent: number; // Percentage change over data range
}

// Calculate latest net interest (earned - paid)
const calculateLatestNetInterest = (data: InterestEarnedDataPoint[]): number => {
  if (!data.length) return 0;

  // Get latest data per bank (since cumulative values, we want the most recent)
  const latestByBank: Record<string, InterestEarnedDataPoint> = {};

  data.forEach((item) => {
    const key = item.bank_address;
    if (!latestByBank[key] || new Date(item.bank_snapshot_time) > new Date(latestByBank[key].bank_snapshot_time)) {
      latestByBank[key] = item;
    }
  });

  // Sum across banks
  const totalEarned = Object.values(latestByBank).reduce(
    (sum, item) => sum + item.cumulative_interest_earned_usd_close,
    0
  );
  const totalPaid = Object.values(latestByBank).reduce((sum, item) => sum + item.cumulative_interest_paid_usd_close, 0);

  return totalEarned - totalPaid;
};

// Fill gaps in daily interest data within the actual data range (no artificial dates)
const fillInterestDataGaps = (dailyNetInterest: Record<string, number>): Record<string, number> => {
  const existingDates = Object.keys(dailyNetInterest).sort();

  if (existingDates.length === 0) {
    return {};
  }

  // Use actual first and last dates from the data
  const firstDate = existingDates[0];
  const lastDate = existingDates[existingDates.length - 1];

  // Generate all dates between first and last date (inclusive)
  const startDateObj = new Date(firstDate);
  const endDateObj = new Date(lastDate);

  const allDates: string[] = [];
  const currentDate = new Date(startDateObj);

  while (currentDate <= endDateObj) {
    allDates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const filledInterest: Record<string, number> = {};

  // Forward-fill missing data with last known values (within actual date range only)
  let lastKnownValue = 0;

  allDates.forEach((dateStr) => {
    // Check if we have actual data for this date
    if (dailyNetInterest[dateStr] !== undefined) {
      // Use actual data and update last known value
      filledInterest[dateStr] = dailyNetInterest[dateStr];
      lastKnownValue = dailyNetInterest[dateStr];
    } else {
      // No actual data for this date, use last known value (only within actual range)
      filledInterest[dateStr] = lastKnownValue;
    }
  });

  return filledInterest;
};

// Calculate net interest change using actual data range
const calculateNetInterest30dStats = (data: InterestEarnedDataPoint[]): StatsData => {
  if (!data.length) {
    return { value: 0, change: 0, changePercent: 0 };
  }

  // Group by date and bank, keeping only the latest data per day per bank
  const dailyTotalsByBank: Record<string, Record<string, InterestEarnedDataPoint>> = {};

  data.forEach((item) => {
    const date = item.bank_snapshot_time.split("T")[0]; // Get YYYY-MM-DD
    const bankKey = item.bank_address;

    if (!dailyTotalsByBank[date]) {
      dailyTotalsByBank[date] = {};
    }

    // Keep only the latest entry per bank per day
    if (
      !dailyTotalsByBank[date][bankKey] ||
      new Date(item.bank_snapshot_time) > new Date(dailyTotalsByBank[date][bankKey].bank_snapshot_time)
    ) {
      dailyTotalsByBank[date][bankKey] = item;
    }
  });

  // Calculate daily net interest totals (raw data)
  const rawDailyNetInterest: Record<string, number> = {};

  Object.keys(dailyTotalsByBank).forEach((date) => {
    const banksForDate = dailyTotalsByBank[date];
    let totalEarned = 0;
    let totalPaid = 0;

    Object.values(banksForDate).forEach((item) => {
      totalEarned += item.cumulative_interest_earned_usd_close;
      totalPaid += item.cumulative_interest_paid_usd_close;
    });

    rawDailyNetInterest[date] = totalEarned - totalPaid;
  });

  // Fill gaps within actual data range only
  const dailyNetInterest = fillInterestDataGaps(rawDailyNetInterest);

  const sortedDates = Object.keys(dailyNetInterest).sort();
  if (sortedDates.length === 0) {
    return { value: 0, change: 0, changePercent: 0 };
  }

  // Use actual first and last dates from the data
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  const firstValue = dailyNetInterest[firstDate];
  const lastValue = dailyNetInterest[lastDate];

  // Calculate change (last vs first)
  const change = lastValue - firstValue;
  const changePercent = firstValue !== 0 ? (change / Math.abs(firstValue)) * 100 : 0;

  return {
    value: lastValue,
    change,
    changePercent,
  };
};

const useInterestData = (selectedAccount: string | null): UseInterestDataReturn => {
  const [data, setData] = React.useState<InterestEarnedDataPoint[]>([]);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchInterestData = async () => {
      if (!selectedAccount) {
        setIsLoading(false);
        setError(new Error("No account selected"));
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/user/interest-earned?account=${selectedAccount}`);
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication required");
          }
          throw new Error(`Error fetching interest data: ${response.statusText}`);
        }

        const result: InterestEarnedDataPoint[] = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch interest data"));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterestData();
  }, [selectedAccount]);

  // Calculate latest net interest
  const latestNetInterest = React.useMemo(() => calculateLatestNetInterest(data), [data]);

  // Calculate net interest change across actual data range
  const netInterest30d = React.useMemo(() => calculateNetInterest30dStats(data), [data]);

  return { data, latestNetInterest, netInterest30d, error, isLoading };
};

export { useInterestData, type UseInterestDataReturn, type InterestEarnedDataPoint, type StatsData };
