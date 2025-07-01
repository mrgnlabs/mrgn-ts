import { InterestEarnedDataPoint, StatsData } from "../types";

/**
 * Calculate latest net interest (earned - paid)
 */
export const calculateLatestNetInterest = (data: InterestEarnedDataPoint[]): number => {
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
  
  // Handle floating-point precision issues by treating very small values as zero
  const netInterest = totalEarned - totalPaid;
  const result = Math.abs(netInterest) < 1e-10 ? 0 : netInterest;

  return result;
};

/**
 * Fill gaps in daily interest data within the actual data range (no artificial dates)
 */
export const fillInterestDataGaps = (dailyNetInterest: Record<string, number>): Record<string, number> => {
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

/**
 * Calculate net interest change using actual data range
 */
export const calculateNetInterest30dStats = (data: InterestEarnedDataPoint[]): StatsData => {
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

    // Handle floating-point precision issues
    const netInterest = totalEarned - totalPaid;
    rawDailyNetInterest[date] = Math.abs(netInterest) < 1e-10 ? 0 : netInterest;
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

  // Handle floating-point precision issues
  const firstValue = Math.abs(dailyNetInterest[firstDate]) < 1e-10 ? 0 : dailyNetInterest[firstDate];
  const lastValue = Math.abs(dailyNetInterest[lastDate]) < 1e-10 ? 0 : dailyNetInterest[lastDate];

  // Calculate change (last vs first)
  const change = lastValue - firstValue;

  let changePercent = 0;
  // Only calculate percentage if both values aren't effectively zero
  if (Math.abs(firstValue) >= 1e-10) {
    if (Math.abs(firstValue) < 0.01) {
      changePercent = change > 0 ? 100 : (change < 0 ? -100 : 0);
    } else {
      changePercent = (change / Math.abs(firstValue)) * 100;
    }
  }

  return {
    value: lastValue,
    change,
    changePercent,
  };
};
