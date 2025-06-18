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
  netInterest7d: StatsData; // 7-day change in net interest
  error: Error | null;
  isLoading: boolean;
}

interface StatsData {
  value: number; // Current value
  change: number; // Absolute change over 7 days
  changePercent: number; // Percentage change over 7 days
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

// Fill gaps in daily interest data to extend to today (similar to portfolio logic)
const fillInterestDataGaps = (dailyNetInterest: Record<string, number>): Record<string, number> => {
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

  const filledInterest: Record<string, number> = {};

  // Initialize all dates with zero values
  allDates.forEach((dateStr) => {
    filledInterest[dateStr] = 0;
  });

  // Populate with actual data where available
  Object.keys(dailyNetInterest).forEach((date) => {
    if (filledInterest[date] !== undefined) {
      filledInterest[date] = dailyNetInterest[date];
    }
  });

  // Forward-fill missing data with last known values
  let lastKnownValue = 0;

  allDates.forEach((dateStr) => {
    const currentValue = filledInterest[dateStr];
    if (currentValue !== 0) {
      lastKnownValue = currentValue;
    } else {
      filledInterest[dateStr] = lastKnownValue;
    }
  });

  return filledInterest;
};

// Calculate 7-day net interest change
const calculateNetInterest7dStats = (data: InterestEarnedDataPoint[]): StatsData => {
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

  // Fill gaps to extend data to today (like portfolio does)
  const dailyNetInterest = fillInterestDataGaps(rawDailyNetInterest);

  const sortedDates = Object.keys(dailyNetInterest).sort();
  if (sortedDates.length === 0) {
    return { value: 0, change: 0, changePercent: 0 };
  }

  // Get latest data point
  const latestDate = sortedDates[sortedDates.length - 1];
  const latestValue = dailyNetInterest[latestDate];

  // Calculate date 7 days ago
  const latestDateObj = new Date(latestDate);
  const sevenDaysAgoDateObj = new Date(latestDateObj);
  sevenDaysAgoDateObj.setDate(sevenDaysAgoDateObj.getDate() - 7);
  const sevenDaysAgoDateStr = sevenDaysAgoDateObj.toISOString().split("T")[0];

  // Find the closest data point to 7 days ago (should exist now due to gap filling)
  let sevenDaysAgoValue = latestValue; // Default to latest if no historical data

  if (dailyNetInterest[sevenDaysAgoDateStr]) {
    sevenDaysAgoValue = dailyNetInterest[sevenDaysAgoDateStr];
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

    sevenDaysAgoValue = dailyNetInterest[closestDate];
  }

  // Calculate change
  const change = latestValue - sevenDaysAgoValue;
  const changePercent = sevenDaysAgoValue !== 0 ? (change / Math.abs(sevenDaysAgoValue)) * 100 : 0;

  return {
    value: latestValue,
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

  // Calculate 7-day net interest change
  const netInterest7d = React.useMemo(() => calculateNetInterest7dStats(data), [data]);

  return { data, latestNetInterest, netInterest7d, error, isLoading };
};

export { useInterestData, type UseInterestDataReturn, type InterestEarnedDataPoint, type StatsData };
