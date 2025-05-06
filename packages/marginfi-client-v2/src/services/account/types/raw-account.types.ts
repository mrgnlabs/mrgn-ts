import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { WrappedI80F48 } from "@mrgnlabs/mrgn-common";

// ----------------------------------------------------------------------------
// On-chain types
// ----------------------------------------------------------------------------

export interface BalanceRaw {
  active: boolean | number;
  bankPk: PublicKey;
  assetShares: WrappedI80F48;
  liabilityShares: WrappedI80F48;
  emissionsOutstanding: WrappedI80F48;
  lastUpdate: BN;
}

export interface HealthCacheRaw {
  assetValue: WrappedI80F48;
  liabilityValue: WrappedI80F48;
  assetValueMaint: WrappedI80F48;
  liabilityValueMaint: WrappedI80F48;
  assetValueEquity: WrappedI80F48;
  liabilityValueEquity: WrappedI80F48;
  timestamp: BN;
  flags: number;
  prices: number[][];
}

export interface MarginfiAccountRaw {
  group: PublicKey;
  authority: PublicKey;
  lendingAccount: { balances: BalanceRaw[] };
  accountFlags: BN;
  emissionsDestinationAccount: PublicKey;
  healthCache: HealthCacheRaw;
  padding0?: BN[];
}

export type MarginRequirementTypeRaw = { initial: {} } | { maintenance: {} } | { equity: {} };
