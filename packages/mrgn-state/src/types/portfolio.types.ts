/**
 * Raw portfolio data point from API
 */
export interface PortfolioDataPoint {
  assetShares: number;
  liabilityShares: number;
  lastSeenAt: string;
  bankAddress: string;
  bankAssetTag: number;
  snapshotTime: string;
}

export type PositionType = "deposit" | "borrow";

/**
 * Enriched portfolio data point with oracle prices
 */
export interface EnrichedPortfolioDataPoint extends PortfolioDataPoint {
  bankSymbol: string;
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
  data: Record<string, EnrichedPortfolioDataPoint[]>;
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
