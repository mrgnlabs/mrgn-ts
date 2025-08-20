/**
 * Raw portfolio data point from API
 */
export interface PortfolioDataPoint {
  // Time data
  start_time: string;
  end_time: string;
  account_balance_start: string;
  account_balance_end: string;

  // Account and group identifiers
  account_address: string;
  group_address: string;
  authority: string;

  // Bank/asset identifiers
  bank_address: string;
  bank_symbol: string;
  bank_name: string;
  bank_mint: string;
  bank_mint_decimals: number;

  // Price data
  current_usd_price: number;

  // Balance shares
  balance_asset_shares: number;
  asset_share_value: number;
  balance_liability_shares: number;
  liability_share_value: number;
  total_asset_shares: number;
  total_liability_shares: number;

  // Token program
  token_program_address: string;

  // Calculated values
  asset_value_native: number;
  liability_value_native: number;
  asset_value_usd: number;
  liability_value_usd: number;
  asset_share_percentage: number;
  liability_share_percentage: number;

  // Database IDs
  group_id: number;
  bank_id: number;
  parsed_bank_id: number;
  balance_id: number;
  balance_index: number;
  parsed_account_id: number;
  base_account_id: number;
  balance_raw_snapshot_id: number;

  // Risk and operational data
  risk_tier: number;
  asset_tag: number;
  risk_tier_name: string;
  operational_state_name: string;
}

export type PositionType = "deposit" | "borrow";

/**
 * Enriched portfolio data point with oracle prices
 */
export interface EnrichedPortfolioDataPoint extends PortfolioDataPoint {
  depositValueUsd: number;
  borrowValueUsd: number;
  netValueUsd: number;
  positionType: PositionType;
}

/**
 * Stats data for portfolio metrics
 */
export interface PortfolioStatsData {
  value: number; // Current value
  change: number; // Absolute change over data range
  changePercent: number; // Percentage change over data range
}

/**
 * Return type for usePortfolioData hook
 */
export interface PortfolioDataResult {
  data: Record<string, EnrichedPortfolioDataPoint[]> | undefined;
  supplied7d: PortfolioStatsData; // Stats across actual data range
  borrowed7d: PortfolioStatsData; // Stats across actual data range
  netValue7d: PortfolioStatsData; // Stats across actual data range
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Return type for usePortfolioChart hook
 */
export interface PortfolioChartResult {
  data: any; // Using any[] to support both standard and variant-specific data points
  bankSymbols: string[]; // Added to support variant-specific bank symbols
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
}
