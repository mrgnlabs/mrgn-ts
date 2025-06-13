import { AssetTag, EmodeEntryFlags, EmodeFlags, EmodeTag, OperationalState, OracleSetup, RiskTier } from "./bank.types";

export interface InterestRateConfigDto {
  // Curve Params
  optimalUtilizationRate: string;
  plateauInterestRate: string;
  maxInterestRate: string;

  // Fees
  insuranceFeeFixedApr: string;
  insuranceIrFee: string;
  protocolFixedFeeApr: string;
  protocolIrFee: string;
  protocolOriginationFee: string;
}

export interface BankConfigDto {
  assetWeightInit: string;
  assetWeightMaint: string;

  liabilityWeightInit: string;
  liabilityWeightMaint: string;

  depositLimit: string;
  borrowLimit: string;

  riskTier: RiskTier;
  totalAssetValueInitLimit: string;
  assetTag: AssetTag;

  interestRateConfig: InterestRateConfigDto;
  operationalState: OperationalState;

  oracleSetup: OracleSetup;
  oracleKeys: string[];
  oracleMaxAge: number;
}

export interface EmodeEntryDto {
  collateralBankEmodeTag: EmodeTag;
  flags: EmodeEntryFlags[];
  assetWeightInit: string;
  assetWeightMaint: string;
}

export interface EmodeSettingsDto {
  emodeTag: EmodeTag;
  timestamp: number;
  flags: EmodeFlags[];
  emodeEntries: EmodeEntryDto[];
}

export interface BankTypeDto {
  address: string;
  tokenSymbol?: string;
  group: string;
  mint: string;
  mintDecimals: number;

  assetShareValue: string;
  liabilityShareValue: string;

  liquidityVault: string;
  liquidityVaultBump: number;
  liquidityVaultAuthorityBump: number;

  insuranceVault: string;
  insuranceVaultBump: number;
  insuranceVaultAuthorityBump: number;
  collectedInsuranceFeesOutstanding: string;

  feeVault: string;
  feeVaultBump: number;
  feeVaultAuthorityBump: number;
  collectedGroupFeesOutstanding: string;

  lastUpdate: number;

  config: BankConfigDto;

  totalAssetShares: string;
  totalLiabilityShares: string;

  emissionsActiveBorrowing: boolean;
  emissionsActiveLending: boolean;
  emissionsRate: number;
  emissionsMint: string;
  emissionsRemaining: string;

  oracleKey: string;
  pythShardId?: number;
  emode: EmodeSettingsDto;
}
