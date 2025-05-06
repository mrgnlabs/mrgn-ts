import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import BN from "bn.js";

export interface BalanceType {
  active: boolean;
  bankPk: PublicKey;
  assetShares: BigNumber;
  liabilityShares: BigNumber;
  emissionsOutstanding: BigNumber;
  lastUpdate: number;
}

export enum HealthCacheFlags {
  /**
   * If set (1), the account is considered healthy and cannot be liquidated.
   * If not set (0), the account is unhealthy and can be liquidated.
   */
  HEALTHY = 1 << 0, // 1
  /**
   * If set (1), the engine did not error during the last health pulse.
   * If not set (0), the engine would have errored and this cache is likely invalid.
   * `RiskEngineInitRejected` is ignored and will allow the flag to be set anyways.
   */
  ENGINE_STATUS_OK = 1 << 1, // 2
  /**
   * If set (1), the engine did not error due to an oracle issue.
   * If not set (0), engine was passed a bad bank or oracle account, or an oracle was stale.
   * Check the order in which accounts were passed and ensure each balance has the correct banks/oracles,
   * and that oracle cranks ran recently enough. Check `internal_err` and `err_index` for more details
   * in some circumstances. Invalid if generated after borrow/withdraw (these instructions will
   * ignore oracle issues if health is still satisfactory with some balance zeroed out).
   */
  ORACLE_OK = 1 << 2, // 4
}

export interface HealthCacheType {
  assetValue: BigNumber;
  liabilityValue: BigNumber;
  assetValueMaint: BigNumber;
  liabilityValueMaint: BigNumber;
  assetValueEquity: BigNumber;
  liabilityValueEquity: BigNumber;
  timestamp: number;
  flags: HealthCacheFlags[];
  prices: number[][];
}

export interface MarginfiAccountType {
  address: PublicKey;
  group: PublicKey;
  authority: PublicKey;
  balances: BalanceType[];
  accountFlags: AccountFlags[];
  emissionsDestinationAccount: PublicKey;
  healthCache: HealthCacheType;
}

export enum AccountFlags {
  ACCOUNT_DISABLED = 1 << 0, // 1
  ACCOUNT_IN_FLASHLOAN = 1 << 1, // 2
  ACCOUNT_FLAG_DEPRECATED = 1 << 2, // 4
  ACCOUNT_TRANSFER_AUTHORITY_ALLOWED = 1 << 3, // 8
}
