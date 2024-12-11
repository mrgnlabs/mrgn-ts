/**
 * ========================================
 *           Marginfi API Types
 * ========================================
 */

/**
 * Types for the pool API endpoints
 */
interface MintApiResponse {
  address: string;
  decimals: string;
  name: string;
  symbol: string;
  token_program: string;
}

interface BankDetailsApiResponse {
  deposit_rate: number;
  borrow_rate: number;
  total_deposits: number;
  total_deposits_usd: number;
  total_borrows: number;
  total_borrows_usd: number;
}

interface BankApiResponse {
  address: string;
  group: string;
  mint: MintApiResponse;
  details: BankDetailsApiResponse;
}

export interface PoolApiResponse {
  group: string;
  quote_banks: BankApiResponse[];
  base_bank: BankApiResponse;
  lookup_tables: string[];
}
