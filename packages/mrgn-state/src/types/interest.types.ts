/**
 * Interest earned data types
 */
export interface InterestEarnedDataPoint {
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
