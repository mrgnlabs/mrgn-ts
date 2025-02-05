/**
 * ========================================
 *           Marginfi API Types
 * ========================================
 */

/**
 * Type definitions for the /api/pool/list endpoint
 * Returns an array of PoolListApiResponse objects containing information about marginfi pools
 */
type PoolListMint = {
  address: string;
  decimals: string;
  name: string;
  symbol: string;
  token_program: string;
};

type PoolListBankDetails = {
  deposit_rate: number;
  borrow_rate: number;
  total_deposits: number;
  total_deposits_usd: number;
  total_borrows: number;
  total_borrows_usd: number;
};

type PoolListBank = {
  address: string;
  group: string;
  mint: PoolListMint;
  details: PoolListBankDetails;
};

export type PoolListApiResponse = {
  group: string;
  quote_bank: PoolListBank;
  base_bank: PoolListBank;
  lookup_tables: string[];
  featured: boolean;
  created_at: string;
  created_by: string;
};

/**
 * Type definitions for the /api/pool/positions endpoint
 * Returns an array of PoolListApiResponse objects containing information about marginfi pools
 */

type PoolPositionsBank = {
  address: string;
  start_amount: number;
  start_usd_amount: number;
  current_amount: number;
  current_usd_amount: number;
  pnl: number;
  interest: number;
};

export type PoolPositionsApiResponse = {
  group: string;
  authority: string;
  address: string;
  direction: string;
  entry_price: number;
  position_value: number;
};

/**
 * Type definitions for the /api/pool/oracle endpoint
 */
export type PoolOracleApiResponse = {
  programIdl: string;
  programId: string;
  queueKey: string;
};

/**
 * Type definitions for the /api/token/market-data endpoint
 */
export type BirdeyeMarketDataResponse = {
  address: string;
  liquidity: number;
  price: number;
  supply: number;
  marketcap: number;
  circulating_supply: number;
  circulating_marketcap: number;
};

/**
 * Type definitions for the /api/token/trending endpoint
 */
export type BirdeyeTrendingToken = {
  address: string;
  decimals: number;
  liquidity: number;
  logoURI: string;
  name: string;
  symbol: string;
  volume24hUSD: number;
  rank: number;
  price: number;
};

/**
 * Type definitions for the /api/oracle/priceV2 endpoint
 */
interface PriceWithConfidenceString {
  price: string;
  confidence: string;
  lowestPrice: string;
  highestPrice: string;
}

export interface OraclePriceString {
  priceRealtime: PriceWithConfidenceString;
  priceWeighted: PriceWithConfidenceString;
  timestamp?: string;
}

export type OraclePriceV2ApiResponse = {
  [key: string]: OraclePriceString;
};
