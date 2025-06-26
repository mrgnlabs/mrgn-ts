import { BankChartData, BankChartDataDailyAverages } from "../types/bank-chart.types";

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
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};
