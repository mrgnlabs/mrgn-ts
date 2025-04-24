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
      const rateDate = new Date(rate.time);
      return rateDate <= now && rateDate >= thirtyDaysAgo;
    })
    // Sort by date ascending (oldest to newest)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .forEach((rate) => {
      const date = rate.time.split("T")[0]; // Get YYYY-MM-DD

      // Only store if we don't have an entry for this date yet
      if (!dailyEntries.has(date)) {
        dailyEntries.set(date, rate);
      }
    });

  // Convert to our DailyAverages format
  return Array.from(dailyEntries.entries())
    .map(([date, entry]) => ({
      timestamp: date,
      borrowRate: parseFloat(entry.borrow_rate_pct),
      depositRate: parseFloat(entry.deposit_rate_pct),
      totalBorrows: parseFloat(entry.total_borrows),
      totalDeposits: parseFloat(entry.total_deposits),
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};
