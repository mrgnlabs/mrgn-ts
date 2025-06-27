import { BankChartData, BankChartDataDailyAverages } from "../types";

export const filterDailyRates = (data: BankChartData[]): BankChartDataDailyAverages[] => {
  // Get the current date and 30 days ago
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Group entries by date (YYYY-MM-DD)
  const dailyEntries = new Map<string, BankChartData>();

  data
    // Filter out future dates and dates older than 30 days
    .filter((rate) => {
      const rateDate = new Date(rate.timestamp);
      return rateDate <= now && rateDate >= thirtyDaysAgo;
    })
    // Sort by date ascending (oldest to newest)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .forEach((rate) => {
      const date = rate.timestamp.split("T")[0]; // Get YYYY-MM-DD

      // Only store if we don't have an entry for this date yet
      if (!dailyEntries.has(date)) {
        dailyEntries.set(date, rate);
      }
    });

  // Convert to our DailyAverages format
  return Array.from(dailyEntries.entries())
    .map(([date, entry]) => ({
      timestamp: date,
      borrowRate: entry.borrowRate,
      depositRate: entry.depositRate,
      totalBorrows: entry.totalBorrows,
      totalDeposits: entry.totalDeposits,
      totalBorrowsUsd: entry.totalBorrowsUsd,
      totalDepositsUsd: entry.totalDepositsUsd,
      usdPrice: entry.usdPrice,
      utilization: entry.utilization,
      optimalUtilizationRate: entry.optimalUtilizationRate,
      baseRate: entry.baseRate,
      plateauInterestRate: entry.plateauInterestRate,
      maxInterestRate: entry.maxInterestRate,
      insuranceIrFee: entry.insuranceIrFee || 0,
      protocolIrFee: entry.protocolIrFee || 0,
      programFeeRate: entry.programFeeRate || 0,
      insuranceFeeFixedApr: entry.insuranceFeeFixedApr || 0,
      protocolFixedFeeApr: entry.protocolFixedFeeApr || 0,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

// Function to fill gaps in bank chart data by duplicating the most recent values
export const fillDataGaps = (
  data: BankChartDataDailyAverages[],
  daysToFill: number = 30
): BankChartDataDailyAverages[] => {
  if (!data || data.length === 0) {
    return [];
  }

  // Sort data by timestamp to ensure proper ordering
  const sortedData = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Generate array of all dates for the last N days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (daysToFill - 1));

  const allDates: string[] = [];
  for (let i = 0; i < daysToFill; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    allDates.push(currentDate.toISOString().split("T")[0]); // YYYY-MM-DD format
  }

  const filledData: BankChartDataDailyAverages[] = [];
  let lastKnownData: BankChartDataDailyAverages | null = null;

  for (const dateStr of allDates) {
    // Check if we have data for this date
    const existingData = sortedData.find((item) => item.timestamp.split("T")[0] === dateStr);

    if (existingData) {
      // Use actual data if available
      filledData.push(existingData);
      lastKnownData = existingData;
    } else if (lastKnownData) {
      // Fill gap with most recent known data, but update timestamp
      filledData.push({
        ...lastKnownData,
        timestamp: `${dateStr}T00:00:00+00:00`,
      });
    } else {
      // If no previous data exists, look for next available data point
      const futureData = sortedData.find((item) => new Date(item.timestamp) > new Date(`${dateStr}T00:00:00+00:00`));

      if (futureData) {
        filledData.push({
          ...futureData,
          timestamp: `${dateStr}T00:00:00+00:00`,
        });
        lastKnownData = futureData;
      } else {
        // If no data at all, create zero entry (this should be rare)
        filledData.push({
          timestamp: `${dateStr}T00:00:00+00:00`,
          borrowRate: 0,
          depositRate: 0,
          totalBorrows: 0,
          totalDeposits: 0,
          totalBorrowsUsd: 0,
          totalDepositsUsd: 0,
          usdPrice: 0,
          utilization: 0,
          optimalUtilizationRate: 0,
          baseRate: 0,
          plateauInterestRate: 0,
          maxInterestRate: 0,
          insuranceIrFee: 0,
          protocolIrFee: 0,
          programFeeRate: 0,
          insuranceFeeFixedApr: 0,
          protocolFixedFeeApr: 0,
        });
      }
    }
  }

  return filledData;
};
