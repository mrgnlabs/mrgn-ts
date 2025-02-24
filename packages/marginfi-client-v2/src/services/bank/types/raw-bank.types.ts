import { WrappedI80F48 } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ----------------------------------------------------------------------------
// On-chain types
// ----------------------------------------------------------------------------

interface BankRaw {
  mint: PublicKey;
  mintDecimals: number;

  group: PublicKey;

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

  totalLiabilityShares: WrappedI80F48;
  totalAssetShares: WrappedI80F48;

  lastUpdate: BN;

  config: BankConfigRaw;

  flags: BN;
  emissionsRate: BN;
  emissionsMint: PublicKey;
  emissionsRemaining: WrappedI80F48;
}

interface BankConfigRaw {
  assetWeightInit: WrappedI80F48;
  assetWeightMaint: WrappedI80F48;

  liabilityWeightInit: WrappedI80F48;
  liabilityWeightMaint: WrappedI80F48;

  depositLimit: BN;
  borrowLimit: BN;
  riskTier: RiskTierRaw;
  totalAssetValueInitLimit: BN;
  oracleMaxAge: number;
  assetTag: number;

  interestRateConfig: InterestRateConfigRaw;
  operationalState: OperationalStateRaw;

  oracleSetup: OracleSetupRaw;
  oracleKeys: PublicKey[];

  permissionlessBadDebtSettlement: boolean;
  freezeSettings: boolean;
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
}

interface BankConfigCompactRaw extends Omit<BankConfigRaw, "oracleKeys" | "oracle" | "oracleSetup"> {
  oracleMaxAge: number;
  // auto_padding_0: number[];
  // auto_padding_1: number[];
}

type RiskTierRaw = { collateral: {} } | { isolated: {} };

type OperationalStateRaw = { paused: {} } | { operational: {} } | { reduceOnly: {} };

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
  | { stakedWithPythPush: {} };

interface OracleConfigOptRaw {
  setup: OracleSetupRaw;
  keys: PublicKey[];
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
