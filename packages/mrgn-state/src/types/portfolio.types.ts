/**
 * Portfolio data types for user portfolio data
 */

/**
 * Raw portfolio data point from API
 */
export interface PortfolioDataPoint {
  account_id: number;
  account_address: string;
  bank_address: string;
  bank_name: string;
  bank_symbol: string;
  bucket_start: string;
  bucket_end: string;
  asset_shares: number;
  liability_shares: number;
  price: number;
  deposit_value_usd: number;
  borrow_value_usd: number;
  net_value_usd: number;
}

/**
 * Enriched portfolio data point with oracle prices
 */
export interface EnrichedPortfolioDataPoint extends PortfolioDataPoint {
  bank_symbol: string; // Ensure this uses oracle data
  deposit_value_usd: number; // Recalculated with oracle prices
  borrow_value_usd: number; // Recalculated with oracle prices
  net_value_usd: number; // Recalculated with oracle prices
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
  data: EnrichedPortfolioDataPoint[];
  filledDailyTotals: Record<string, { deposits: number; borrows: number }>; // Gap-filled daily totals for chart consistency
  filledBankData: Record<string, Record<string, { deposits: number; borrows: number }>>; // Gap-filled per-bank data
  supplied30d: PortfolioStatsData; // Stats across actual data range
  borrowed30d: PortfolioStatsData; // Stats across actual data range
  netValue30d: PortfolioStatsData; // Stats across actual data range
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Chart data point for portfolio chart
 */
export interface PortfolioChartDataPoint {
  timestamp: string;
  deposits: number;
  borrows: number;
  net: number;
}

/**
 * Return type for usePortfolioChart hook
 */
export interface PortfolioChartResult {
  data: any[]; // Using any[] to support both standard and variant-specific data points
  bankSymbols: string[]; // Added to support variant-specific bank symbols
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
}
