import { dynamicNumeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";
import { BankChartData, BankChartDataDailyAverages } from "../types/bank-chart.types";
import { historicBankChartData } from "@mrgnlabs/mrgn-state";

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

// Enhanced chart data type with formatted fields
type FormattedChartData = historicBankChartData & {
  displayTotalBorrows: number;
  displayTotalDeposits: number;
  formattedBorrowRate: string;
  formattedDepositRate: string;
  formattedTotalBorrows: string;
  formattedTotalDeposits: string;
  formattedUtilization: string;
  formattedUsdPrice: string;
  date: string;
};

// Interest curve data point type
type InterestCurveDataPoint = {
  utilization: number;
  borrowAPY: number;
  supplyAPY: number;
};

/**
 * Formats raw chart data with proper display values and formatted strings
 */
export const formatChartData = (rawData: historicBankChartData[] | null, showUSD: boolean): FormattedChartData[] => {
  if (!rawData || rawData.length === 0) {
    return [];
  }

  return rawData.map((item) => {
    const displayTotalBorrows = showUSD ? item.totalBorrows * item.usdPrice : item.totalBorrows;
    const displayTotalDeposits = showUSD ? item.totalDeposits * item.usdPrice : item.totalDeposits;

    return {
      ...item,
      displayTotalBorrows,
      displayTotalDeposits,
      formattedBorrowRate: percentFormatter.format(item.borrowRate),
      formattedDepositRate: percentFormatter.format(item.depositRate),
      formattedTotalBorrows: dynamicNumeralFormatter(displayTotalBorrows),
      formattedTotalDeposits: dynamicNumeralFormatter(displayTotalDeposits),
      formattedUtilization: percentFormatter.format(item.utilization),
      formattedUsdPrice: `$${dynamicNumeralFormatter(item.usdPrice)}`,
      date: (() => {
        const date = new Date(item.timestamp);
        const month = date.toLocaleDateString("en-US", { month: "short" });
        const day = date.getDate();
        return `${month} ${day}`;
      })(),
    };
  });
};

/**
 * Generates interest curve data points based on the latest bank parameters
 */
export const generateInterestCurveData = (formattedData: FormattedChartData[]): InterestCurveDataPoint[] => {
  if (!formattedData || formattedData.length === 0) {
    return [];
  }

  const latestDataPoint = formattedData[formattedData.length - 1];

  return Array.from({ length: 101 }, (_, i) => {
    const utilization = i / 100;

    // Calculate interest rates based on the interest rate model
    const optimalUtilization = latestDataPoint.optimalUtilizationRate || 0.8;
    const plateauRate = latestDataPoint.plateauInterestRate || 0.1;
    const maxRate = latestDataPoint.maxInterestRate || 1.0;
    const baseRate = latestDataPoint.baseRate || 0;

    let borrowRate: number;
    if (utilization <= optimalUtilization) {
      // Linear interpolation from base rate to plateau rate
      borrowRate = baseRate + (plateauRate - baseRate) * (utilization / optimalUtilization);
    } else {
      // Linear interpolation from plateau rate to max rate
      const excessUtilization = utilization - optimalUtilization;
      const maxExcessUtilization = 1 - optimalUtilization;
      borrowRate = plateauRate + (maxRate - plateauRate) * (excessUtilization / maxExcessUtilization);
    }

    // Calculate supply rate (borrow rate minus fees)
    const protocolFee = latestDataPoint.protocolIrFee || 0;
    const insuranceFee = latestDataPoint.insuranceIrFee || 0;
    const supplyRate = borrowRate * utilization * (1 - protocolFee - insuranceFee);

    return {
      utilization,
      borrowAPY: borrowRate * 100,
      supplyAPY: supplyRate * 100,
    };
  });
};
