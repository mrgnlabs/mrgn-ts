/**
 * Interest earned data types
 */
export interface InterestEarnedDataPoint {
  start_time: string;
  end_time: string;
  account_address: string;
  bank_address: string;
  balance_id: number;
  bank_symbol: string;
  bank_name: string;
  bank_mint: string;
  current_usd_price: number;
  asset_value_native: number;
  liability_value_native: number;
  asset_value_usd: number;
  liability_value_usd: number;
  initial_asset_value_native: number;
  initial_liability_value_native: number;
  initial_asset_value_usd: number;
  initial_liability_value_usd: number;
  incremental_interest_earned_native: number;
  incremental_interest_paid_native: number;
  incremental_interest_earned_usd: number;
  incremental_interest_paid_usd: number;
  cumulative_interest_earned_native: number;
  cumulative_interest_paid_native: number;
  cumulative_interest_earned_usd: number;
  cumulative_interest_paid_usd: number;
}

/**
 * Stats data for interest metrics
 */
export interface StatsData {
  value: number; // Current value
  change: number; // Absolute change over data range
  changePercent: number; // Percentage change over data range
}

/**
 * Return type for useInterestData hook
 */
export interface InterestDataResult {
  data: InterestEarnedDataPoint[];
  latestNetInterest: number; // Latest net interest (earned - paid)
  netInterest30d: StatsData; // Change in net interest across actual data range
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Chart data point for interest chart
 */
export interface InterestChartDataPoint {
  timestamp: string;
  [bankSymbol: string]: number | string;
}

/**
 * Return type for useInterestChart hook
 */
export interface InterestChartResult {
  data: InterestChartDataPoint[];
  bankSymbols: string[];
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
}
