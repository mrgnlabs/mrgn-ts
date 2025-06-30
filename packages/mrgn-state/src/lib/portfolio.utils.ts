import { EnrichedPortfolioDataPoint, PortfolioChartDataPoint, PortfolioDataPoint, PortfolioStatsData } from "../types";
import type { ExtendedBankInfo } from "../types/bank.types";

/**
 * Enrich portfolio data with oracle prices and proper USD calculations
 * @param data Raw portfolio data from API
 * @param banks Array of bank info objects with oracle prices
 * @returns Enriched portfolio data with USD values
 */
export const enrichPortfolioData = (
  data: PortfolioDataPoint[],
  banks: ExtendedBankInfo[]
): EnrichedPortfolioDataPoint[] => {
  // Create a map of bank addresses to bank info for quick lookup
  const bankMap = banks.reduce(
    (map, bank) => {
      map[bank.address.toBase58()] = bank;
      return map;
    },
    {} as Record<string, ExtendedBankInfo>
  );

  // Enrich data with oracle prices and proper USD calculations
  return data.map((item) => {
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
};

/**
 * Calculate daily totals from portfolio data points
 * @param data Enriched portfolio data
 * @returns Daily totals for deposits and borrows
 */
export const calculateDailyTotals = (
  data: EnrichedPortfolioDataPoint[]
): Record<string, { deposits: number; borrows: number; net: number }> => {
  if (!data?.length) return {};

  const dailyTotals: Record<string, { deposits: number; borrows: number; net: number }> = {};

  data.forEach((item) => {
    const date = item.bucket_start.split("T")[0];
    if (!dailyTotals[date]) {
      dailyTotals[date] = { deposits: 0, borrows: 0, net: 0 };
    }
    dailyTotals[date].deposits += item.deposit_value_usd;
    dailyTotals[date].borrows += item.borrow_value_usd;
    dailyTotals[date].net = dailyTotals[date].deposits - dailyTotals[date].borrows;
  });

  return dailyTotals;
};

/**
 * Calculate per-bank daily totals from portfolio data points
 * @param data Enriched portfolio data
 * @returns Per-bank daily totals for deposits and borrows
 */
export const calculatePerBankDailyTotals = (
  data: EnrichedPortfolioDataPoint[]
): Record<string, Record<string, { deposits: number; borrows: number; net: number }>> => {
  if (!data?.length) return {};

  // Get unique bank symbols
  const bankSymbols = Array.from(new Set(data.map((item) => item.bank_symbol)));

  // Find overall date range across ALL banks to ensure consistency
  const allDates = Array.from(new Set(data.map((item) => item.bucket_start.split("T")[0]))).sort();
  const overallStartDate = allDates[0];
  const overallEndDate = allDates[allDates.length - 1];

  const bankData: Record<string, Record<string, { deposits: number; borrows: number; net: number }>> = {};

  // Process each bank separately
  bankSymbols.forEach((bankSymbol) => {
    const bankItems = data.filter((item) => item.bank_symbol === bankSymbol);

    // Create daily totals for this bank
    const bankDailyTotals: Record<string, { deposits: number; borrows: number; net: number }> = {};
    bankItems.forEach((item) => {
      const date = item.bucket_start.split("T")[0];
      if (!bankDailyTotals[date]) {
        bankDailyTotals[date] = { deposits: 0, borrows: 0, net: 0 };
      }
      bankDailyTotals[date].deposits += item.deposit_value_usd;
      bankDailyTotals[date].borrows += item.borrow_value_usd;
      // Calculate net value
      bankDailyTotals[date].net = bankDailyTotals[date].deposits - bankDailyTotals[date].borrows;
    });

    // Fill gaps for this bank using the OVERALL date range for consistency
    bankData[bankSymbol] = fillPortfolioDataGaps(bankDailyTotals, overallStartDate, overallEndDate);
  });

  return bankData;
};

/**
 * Transform portfolio data into chart format
 * @param filledDailyTotals Gap-filled daily totals
 * @returns Chart-ready data points
 */
export const transformPortfolioDataToChartFormat = (
  filledDailyTotals: Record<string, { deposits: number; borrows: number; net: number }>
): PortfolioChartDataPoint[] => {
  if (!filledDailyTotals || Object.keys(filledDailyTotals).length === 0) {
    return [];
  }

  // Convert daily totals to chart data points
  return Object.entries(filledDailyTotals)
    .map(([date, values]) => ({
      timestamp: date,
      deposits: values.deposits,
      borrows: values.borrows,
      net: values.net, // Use the pre-calculated net value
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

/**
 * Fill gaps in daily totals within the actual data range and extend to current date
 */
export const fillPortfolioDataGaps = (
  dailyTotals: Record<string, { deposits: number; borrows: number; net?: number }>,
  overrideStartDate?: string,
  overrideEndDate?: string
): Record<string, { deposits: number; borrows: number; net: number }> => {
  const existingDates = Object.keys(dailyTotals).sort();

  if (existingDates.length === 0) {
    console.log("No existing dates in dailyTotals");
    return {};
  }

  // Use override dates if provided (for consistent cross-bank date range)
  const firstDate = overrideStartDate || existingDates[0];

  const today = new Date().toISOString().split("T")[0];
  const lastDate = today;

  // Generate all dates between first and last date (inclusive)
  const startDateObj = new Date(firstDate);
  const endDateObj = new Date(lastDate);

  const allDates: string[] = [];
  const currentDate = new Date(startDateObj);

  while (currentDate <= endDateObj) {
    allDates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const filledTotals: Record<string, { deposits: number; borrows: number; net: number }> = {};

  // Forward-fill missing data with last known values (within actual date range only)
  let lastDeposits = 0;
  let lastBorrows = 0;
  let lastNet = 0;

  allDates.forEach((dateStr) => {
    // Check if we have actual data for this date
    if (dailyTotals[dateStr]) {
      // Use actual data and update last known values
      const deposits = dailyTotals[dateStr].deposits;
      const borrows = dailyTotals[dateStr].borrows;
      const net = dailyTotals[dateStr].net !== undefined ? dailyTotals[dateStr].net : deposits - borrows;

      filledTotals[dateStr] = {
        deposits,
        borrows,
        net: net ?? 0,
      };

      lastDeposits = deposits;
      lastBorrows = borrows;
      lastNet = net ?? 0;
    } else {
      // No actual data for this date, use last known values (only within actual range)
      filledTotals[dateStr] = {
        deposits: lastDeposits,
        borrows: lastBorrows,
        net: lastNet,
      };
    }
  });

  return filledTotals;
};

/**
 * Calculate portfolio statistics using actual data range
 */
export const calculatePortfolioStats = (
  data: EnrichedPortfolioDataPoint[]
): {
  supplied30d: PortfolioStatsData;
  borrowed30d: PortfolioStatsData;
  netValue30d: PortfolioStatsData;
} => {
  if (!data.length) {
    const emptyStats: PortfolioStatsData = { value: 0, change: 0, changePercent: 0 };
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
  const dailyTotals = fillPortfolioDataGaps(rawDailyTotals);

  const sortedDates = Object.keys(dailyTotals).sort();
  if (sortedDates.length === 0) {
    const emptyStats: PortfolioStatsData = { value: 0, change: 0, changePercent: 0 };
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
