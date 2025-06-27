import { BankChartData } from "../types";

/**
 * Formats raw database metrics into the expected chart data format
 * This function is used by the historic.ts API endpoint
 * @param bankMetrics Raw bank metrics from the database
 * @returns Formatted chart data
 */
export const formatRawBankMetrics = (bankMetrics: any[]): BankChartData[] => {
  if (!bankMetrics || bankMetrics.length === 0) {
    return [];
  }

  // Transform data to match expected format
  return bankMetrics.map((entry: any) => ({
    timestamp: entry.day,
    borrowRate: entry.borrow_rate_pct || 0,
    depositRate: entry.deposit_rate_pct || 0,
    totalBorrows: entry.total_borrows || 0,
    totalDeposits: entry.total_deposits || 0,
    // Additional fields for interest rate curve and price history
    usdPrice: entry.usd_price || 0,
    utilization: entry.utilization || 0,
    optimalUtilizationRate: entry.optimal_utilization_rate || 0,
    baseRate: entry.base_rate || 0,
    plateauInterestRate: entry.plateau_interest_rate || 0,
    maxInterestRate: entry.max_interest_rate || 0,
    insuranceIrFee: entry.insurance_ir_fee || 0,
    protocolIrFee: entry.protocol_ir_fee || 0,
    programFeeRate: entry.program_fee_rate || 0,
    insuranceFeeFixedApr: entry.insurance_fee_fixed_apr || 0,
    protocolFixedFeeApr: entry.protocol_fixed_fee_apr || 0,
  }));
};


