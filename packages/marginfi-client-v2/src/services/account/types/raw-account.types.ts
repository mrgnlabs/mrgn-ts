import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { WrappedI80F48 } from "@mrgnlabs/mrgn-common";

// ----------------------------------------------------------------------------
// On-chain types
// ----------------------------------------------------------------------------

interface BalanceRaw {
  active: boolean | number;
  bankPk: PublicKey;
  assetShares: WrappedI80F48;
  liabilityShares: WrappedI80F48;
  emissionsOutstanding: WrappedI80F48;
  lastUpdate: BN;
}

interface HealthCacheRaw {
  assetValue: WrappedI80F48;
  liabilityValue: WrappedI80F48;
  timestamp: BN;
  flags: BN;
  prices: WrappedI80F48[];
}

interface MarginfiAccountRaw {
  group: PublicKey;
  authority: PublicKey;
  lendingAccount: { balances: BalanceRaw[] };
  accountFlags: BN;
  emissionsDestinationAccount: PublicKey;
  healthCache: HealthCacheRaw;
  padding0?: BN[];
}

type MarginRequirementTypeRaw = { initial: {} } | { maintenance: {} } | { equity: {} };

export type { MarginfiAccountRaw, BalanceRaw, MarginRequirementTypeRaw };
