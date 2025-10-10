import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import { WrappedI80F48 } from "@mrgnlabs/mrgn-common";

// ----------------------------------------------------------------------------
// On-chain types
// ----------------------------------------------------------------------------

interface BankRaw {
  group: PublicKey;
  mint: PublicKey;
  mintDecimals: number;

  assetShareValue: WrappedI80F48;
  liabilityShareValue: WrappedI80F48;

  liquidityVault: PublicKey;
  liquidityVaultBump: number;
  liquidityVaultAuthorityBump: number;

  insuranceVault: PublicKey;
  insuranceVaultBump: number;
  insuranceVaultAuthorityBump: number;
  collectedInsuranceFeesOutstanding: WrappedI80F48;

  feeVault: PublicKey;
  feeVaultBump: number;
  feeVaultAuthorityBump: number;
  collectedGroupFeesOutstanding: WrappedI80F48;

  lastUpdate: BN;

  config: BankConfigRaw;

  totalLiabilityShares: WrappedI80F48;
  totalAssetShares: WrappedI80F48;

  flags: BN;
  emissionsRate: BN;
  emissionsRemaining: WrappedI80F48;
  emissionsMint: PublicKey;

  emode: EmodeSettingsRaw;
  feesDestinationAccount?: PublicKey;
  cache?: BankCacheRaw;
  lendingPositionCount?: number;
  borrowingPositionCount?: number;
}

interface BankCacheRaw {
  baseRate: number;
  lendingRate: number;
  borrowingRate: number;
  accumulatedSinceLastUpdate: WrappedI80F48;
}

interface BankConfigRaw {
  assetWeightInit: WrappedI80F48;
  assetWeightMaint: WrappedI80F48;

  liabilityWeightInit: WrappedI80F48;
  liabilityWeightMaint: WrappedI80F48;

  depositLimit: BN;
  interestRateConfig: InterestRateConfigRaw;
  operationalState: OperationalStateRaw;

  oracleSetup: OracleSetupRaw;
  oracleKeys: PublicKey[];

  borrowLimit: BN;
  riskTier: RiskTierRaw;
  assetTag: number;
  configFlags: number;

  totalAssetValueInitLimit: BN;
  oracleMaxAge: number;
  oracleMaxConfidence: number;
}

interface BankConfigOptRaw {
  assetWeightInit: WrappedI80F48 | null;
  assetWeightMaint: WrappedI80F48 | null;

  liabilityWeightInit: WrappedI80F48 | null;
  liabilityWeightMaint: WrappedI80F48 | null;

  depositLimit: BN | null;
  borrowLimit: BN | null;
  riskTier: { collateral: {} } | { isolated: {} } | null;
  assetTag: number | null;
  totalAssetValueInitLimit: BN | null;

  interestRateConfig: InterestRateConfigRaw | null;
  operationalState: { paused: {} } | { operational: {} } | { reduceOnly: {} } | null;

  oracleMaxAge: number | null;
  permissionlessBadDebtSettlement: boolean | null;
  freezeSettings: boolean | null;
  oracleMaxConfidence: number | null;
}

interface BankConfigCompactRaw extends Omit<BankConfigRaw, "oracleKeys" | "oracle" | "oracleSetup"> {
  oracleMaxAge: number;
  padding0?: BN[];
  padding1?: BN[];
}

type RiskTierRaw = { collateral: {} } | { isolated: {} };

type OperationalStateRaw = { paused: {} } | { operational: {} } | { reduceOnly: {} } | { killedByBankruptcy: {} };

interface InterestRateConfigRaw {
  // Curve Params
  optimalUtilizationRate: WrappedI80F48;
  plateauInterestRate: WrappedI80F48;
  maxInterestRate: WrappedI80F48;

  // Fees
  insuranceFeeFixedApr: WrappedI80F48;
  insuranceIrFee: WrappedI80F48;
  protocolFixedFeeApr: WrappedI80F48;
  protocolIrFee: WrappedI80F48;

  protocolOriginationFee: WrappedI80F48;
}

type OracleSetupRaw =
  | { none: {} }
  | { pythLegacy: {} }
  | { switchboardV2: {} }
  | { pythPushOracle: {} }
  | { switchboardPull: {} }
  | { stakedWithPythPush: {} }
  | { kaminoPythPush: {} }
  | { kaminoSwitchboardPull: {} };

interface OracleConfigOptRaw {
  setup: OracleSetupRaw;
  keys: PublicKey[];
}

interface EmodeEntryRaw {
  collateralBankEmodeTag: number;
  flags: number;
  assetWeightInit: WrappedI80F48;
  assetWeightMaint: WrappedI80F48;
}

export interface EmodeSettingsRaw {
  emodeTag: number;
  timestamp: BN;
  flags: BN;
  emodeConfig: EmodeConfigRaw;
}

export interface EmodeConfigRaw {
  entries: EmodeEntryRaw[];
}

export type {
  BankRaw,
  BankConfigRaw,
  BankConfigCompactRaw,
  RiskTierRaw,
  InterestRateConfigRaw,
  OracleSetupRaw,
  OperationalStateRaw,
  OracleConfigOptRaw,
  BankConfigOptRaw,
};
