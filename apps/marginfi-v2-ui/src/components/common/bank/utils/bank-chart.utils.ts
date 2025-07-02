import { dynamicNumeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";
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

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

type InterestRateParams = {
  utilizationRate: number;
  optimalUtilizationRate?: number;
  plateauInterestRate?: number;
  maxInterestRate?: number;
  insuranceFeeFixedApr?: number;
  protocolFixedFeeApr?: number;
  insuranceIrFee?: number;
  protocolIrFee?: number;
};

export const computeInterestRates = ({
  utilizationRate,
  optimalUtilizationRate = 0.8,
  plateauInterestRate = 0.1,
  maxInterestRate = 1.0,
  insuranceFeeFixedApr = 0,
  protocolFixedFeeApr = 0,
  insuranceIrFee = 0,
  protocolIrFee = 0,
}: InterestRateParams): { lendingRate: number; borrowingRate: number } => {
  const fixedFee = insuranceFeeFixedApr + protocolFixedFeeApr;
  const rateFee = insuranceIrFee + protocolIrFee;

  let baseInterestRate =
    utilizationRate <= optimalUtilizationRate
      ? (utilizationRate * plateauInterestRate) / optimalUtilizationRate
      : ((utilizationRate - optimalUtilizationRate) / (1 - optimalUtilizationRate)) *
          (maxInterestRate - plateauInterestRate) +
        plateauInterestRate;

  const lendingRate = baseInterestRate * utilizationRate;
  const borrowingRate = baseInterestRate * (1 + rateFee) + fixedFee;

  return { lendingRate, borrowingRate };
};

/**
 * Generates empty chart data for fallback when no data is available
 * @param days Number of days to generate data for
 * @returns Array of empty data points
 */
export const generateEmptyChartData = (days: number = 30): BankChartDataDailyAverages[] => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));

    return {
      timestamp: date.toISOString(),
      depositRate: 0,
      borrowRate: 0,
      totalDeposits: 0,
      totalBorrows: 0,
      totalDepositsUsd: 0,
      totalBorrowsUsd: 0,
      displayTotalDeposits: 0,
      displayTotalBorrows: 0,
      formattedBorrowRate: "0%",
      formattedDepositRate: "0%",
      formattedTotalBorrows: "0",
      formattedTotalDeposits: "0",
      baseRate: 0,
      plateauInterestRate: 0,
      maxInterestRate: 0,
      utilization: 0,
      usdPrice: 0,
      formattedBaseRate: "0%",
      formattedPlateauRate: "0%",
      formattedMaxRate: "0%",
      formattedUtilization: "0%",
      formattedUsdPrice: "$0",
      insuranceIrFee: 0,
      protocolIrFee: 0,
      programFeeRate: 0,
      insuranceFeeFixedApr: 0,
      protocolFixedFeeApr: 0,
      optimalUtilizationRate: 0,
    };
  });
};

/**
 * Formats raw chart data with proper formatting and fallback values
 * @param data Raw chart data from API
 * @param showUSD Whether to show USD values
 * @returns Formatted chart data
 */
export const formatChartData = (data: BankChartData[] | null, showUSD: boolean): BankChartDataDailyAverages[] => {
  if (!data || data.length === 0) {
    return generateEmptyChartData();
  }

  return data.map((item) => {
    // Ensure all values are numbers with fallbacks
    const baseRate = typeof item.baseRate === "number" ? item.baseRate : 0;
    const plateauInterestRate = typeof item.plateauInterestRate === "number" ? item.plateauInterestRate : 0.1;
    const maxInterestRate = typeof item.maxInterestRate === "number" ? item.maxInterestRate : 1.0;
    const utilization = typeof item.utilization === "number" ? item.utilization : 0;
    const usdPrice = typeof item.usdPrice === "number" ? item.usdPrice : 0;
    const insuranceIrFee = typeof item.insuranceIrFee === "number" ? item.insuranceIrFee : 0;
    const protocolIrFee = typeof item.protocolIrFee === "number" ? item.protocolIrFee : 0;
    const programFeeRate = typeof item.programFeeRate === "number" ? item.programFeeRate : 0;
    const optimalUtilizationRate = typeof item.optimalUtilizationRate === "number" ? item.optimalUtilizationRate : 0.8;
    const insuranceFeeFixedApr = typeof item.insuranceFeeFixedApr === "number" ? item.insuranceFeeFixedApr : 0;
    const protocolFixedFeeApr = typeof item.protocolFixedFeeApr === "number" ? item.protocolFixedFeeApr : 0;

    // Calculate display values
    const displayTotalBorrows = showUSD ? item.totalBorrowsUsd || 0 : item.totalBorrows;
    const displayTotalDeposits = showUSD ? item.totalDepositsUsd || 0 : item.totalDeposits;

    return {
      ...item,
      // Format values for all chart types
      formattedBorrowRate: percentFormatter.format(item.borrowRate),
      formattedDepositRate: percentFormatter.format(item.depositRate),
      formattedTotalBorrows: dynamicNumeralFormatter(displayTotalBorrows),
      formattedTotalDeposits: dynamicNumeralFormatter(displayTotalDeposits),
      displayTotalBorrows,
      displayTotalDeposits,
      // Ensure all required values are present
      baseRate,
      plateauInterestRate,
      maxInterestRate,
      utilization,
      usdPrice,
      formattedBaseRate: percentFormatter.format(baseRate),
      formattedPlateauRate: percentFormatter.format(plateauInterestRate),
      formattedMaxRate: percentFormatter.format(maxInterestRate),
      formattedUtilization: percentFormatter.format(utilization),
      formattedUsdPrice: `$${dynamicNumeralFormatter(usdPrice)}`,
      insuranceIrFee,
      protocolIrFee,
      programFeeRate,
      insuranceFeeFixedApr,
      protocolFixedFeeApr,
      optimalUtilizationRate,
    };
  });
};

/**
 * Generates interest curve data points based on the latest bank parameters
 * @param latestData Latest bank data point with interest rate parameters
 * @returns Array of interest curve data points
 */
export const generateInterestCurveData = (latestData: BankChartDataDailyAverages | undefined) => {
  return Array.from({ length: 101 }, (_, i) => {
    const utilization = i / 100;
    const rates = computeInterestRates({
      utilizationRate: utilization,
      optimalUtilizationRate: latestData?.optimalUtilizationRate,
      plateauInterestRate: latestData?.plateauInterestRate,
      maxInterestRate: latestData?.maxInterestRate,
      insuranceFeeFixedApr: latestData?.insuranceFeeFixedApr,
      protocolFixedFeeApr: latestData?.protocolFixedFeeApr,
      insuranceIrFee: latestData?.insuranceIrFee,
      protocolIrFee: latestData?.protocolIrFee,
    });

    return {
      utilization,
      borrowAPY: rates.borrowingRate * 100,
      supplyAPY: rates.lendingRate * 100,
    };
  });
};
