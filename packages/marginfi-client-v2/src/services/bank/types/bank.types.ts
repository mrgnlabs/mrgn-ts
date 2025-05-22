import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

export enum RiskTier {
  Collateral = "Collateral",
  Isolated = "Isolated",
}

export enum OperationalState {
  Paused = "Paused",
  Operational = "Operational",
  ReduceOnly = "ReduceOnly",
}

export interface InterestRateConfig {
  // Curve Params
  optimalUtilizationRate: BigNumber;
  plateauInterestRate: BigNumber;
  maxInterestRate: BigNumber;

  // Fees
  insuranceFeeFixedApr: BigNumber;
  insuranceIrFee: BigNumber;
  protocolFixedFeeApr: BigNumber;
  protocolIrFee: BigNumber;
  protocolOriginationFee: BigNumber;
}

export enum OracleSetup {
  None = "None",
  PythLegacy = "PythLegacy",
  SwitchboardV2 = "SwitchboardV2",
  PythPushOracle = "PythPushOracle",
  SwitchboardPull = "SwitchboardPull",
  StakedWithPythPush = "StakedWithPythPush",
}
export enum AssetTag {
  DEFAULT = 0,
  SOL = 1,
  STAKED = 2,
}

// BankConfigOpt Args
export interface BankConfigOpt {
  assetWeightInit: BigNumber | null;
  assetWeightMaint: BigNumber | null;

  liabilityWeightInit: BigNumber | null;
  liabilityWeightMaint: BigNumber | null;

  depositLimit: BigNumber | null;
  borrowLimit: BigNumber | null;
  riskTier: RiskTier | null;
  totalAssetValueInitLimit: BigNumber | null;
  assetTag: AssetTag | null;

  interestRateConfig: InterestRateConfig | null;
  operationalState: OperationalState | null;

  oracleMaxAge: number | null;
  permissionlessBadDebtSettlement: boolean | null;
}

export interface BankConfigType {
  assetWeightInit: BigNumber;
  assetWeightMaint: BigNumber;

  liabilityWeightInit: BigNumber;
  liabilityWeightMaint: BigNumber;

  depositLimit: BigNumber;
  borrowLimit: BigNumber;

  riskTier: RiskTier;
  totalAssetValueInitLimit: BigNumber;
  assetTag: AssetTag;

  interestRateConfig: InterestRateConfig;
  operationalState: OperationalState;

  oracleSetup: OracleSetup;
  oracleKeys: PublicKey[];
  oracleMaxAge: number;
}

export interface BankType {
  address: PublicKey;
  tokenSymbol: string | undefined;
  group: PublicKey;
  mint: PublicKey;
  mintDecimals: number;

  assetShareValue: BigNumber;
  liabilityShareValue: BigNumber;

  liquidityVault: PublicKey;
  liquidityVaultBump: number;
  liquidityVaultAuthorityBump: number;

  insuranceVault: PublicKey;
  insuranceVaultBump: number;
  insuranceVaultAuthorityBump: number;
  collectedInsuranceFeesOutstanding: BigNumber;

  feeVault: PublicKey;
  feeVaultBump: number;
  feeVaultAuthorityBump: number;
  collectedGroupFeesOutstanding: BigNumber;

  lastUpdate: number;

  config: BankConfigType;

  totalAssetShares: BigNumber;
  totalLiabilityShares: BigNumber;

  emissionsActiveBorrowing: boolean;
  emissionsActiveLending: boolean;
  emissionsRate: number;
  emissionsMint: PublicKey;
  emissionsRemaining: BigNumber;

  oracleKey: PublicKey;
  emode: EmodeSettingsType;
}

/**
 * Bitwise flags for EMode entry
 */
export enum EmodeEntryFlags {
  /**
   * If set, isolated banks with this tag also benefit.
   * If not set, isolated banks continue to offer zero collateral, even if they use this tag.
   * (NOT YET IMPLEMENTED)
   */
  APPLIES_TO_ISOLATED = 1 << 0, // 1
  /** Reserved for future use */
  RESERVED_1 = 1 << 1, // 2
  RESERVED_2 = 1 << 2, // 4
  RESERVED_3 = 1 << 3, // 8
  RESERVED_4 = 1 << 4, // 16
  RESERVED_5 = 1 << 5, // 32
}

export interface EmodeEntry {
  collateralBankEmodeTag: EmodeTag;
  flags: EmodeEntryFlags[];
  assetWeightInit: BigNumber;
  assetWeightMaint: BigNumber;
}

/**
 * Bitwise flags for EMode settings
 */
export enum EmodeFlags {
  /** If set, at least one entry is configured */
  EMODE_ON = 1 << 0, // 1
  /** Reserved for future use */
  RESERVED_1 = 1 << 1, // 2
  RESERVED_2 = 1 << 2, // 4
  RESERVED_3 = 1 << 3, // 8
}

export enum EmodeTag {
  UNSET = 0,
  SOL = 501,
  LST = 157,
  STABLE = 5748,
}

export interface EmodeSettingsType {
  emodeTag: EmodeTag;
  timestamp: number;
  flags: EmodeFlags[];
  emodeEntries: EmodeEntry[];
}

export interface OracleConfigOpt {
  setup: OracleSetup;
  keys: PublicKey[];
}

export type EmodePair = {
  collateralBanks: PublicKey[];
  collateralBankTag: EmodeTag;
  liabilityBank: PublicKey;
  liabilityBankTag: EmodeTag;
  assetWeightMaint: BigNumber;
  assetWeightInit: BigNumber;
};

export enum EmodeImpactStatus {
  ActivateEmode,
  ExtendEmode,
  IncreaseEmode,
  ReduceEmode,
  RemoveEmode,
  InactiveEmode,
}

export interface EmodeImpact {
  status: EmodeImpactStatus;
  resultingPairs: EmodePair[];
  activePair?: EmodePair;
}

export interface ActionEmodeImpact {
  borrowImpact?: EmodeImpact;
  supplyImpact?: EmodeImpact;
  repayAllImpact?: EmodeImpact;
  withdrawAllImpact?: EmodeImpact;
}
