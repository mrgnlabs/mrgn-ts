import { WrappedI80F48 } from "@mrgnlabs/mrgn-common";
import {
  AssetTag,
  BankConfigFlag,
  EmodeEntryFlags,
  EmodeFlags,
  EmodeTag,
  OperationalState,
  OracleSetup,
  RiskTier,
} from "./bank.types";
import { InterestRateConfigRaw, OperationalStateRaw, OracleSetupRaw, RiskTierRaw } from "./raw-bank.types";

/*
 * Bank types Dto
 */
export interface RatePointDto {
  util: number;
  rate: number;
}

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

  zeroUtilRate: number;
  hundredUtilRate: number;
  points: RatePointDto[];
  curveType: number;
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
  configFlags?: BankConfigFlag;

  interestRateConfig: InterestRateConfigDto;
  operationalState: OperationalState;

  oracleSetup: OracleSetup;
  oracleKeys: string[];
  oracleMaxAge: number;
  oracleMaxConfidence: number;
  fixedPrice: string;
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
  feesDestinationAccount?: string;
  lendingPositionCount?: string;
  borrowingPositionCount?: string;
  kaminoReserve: string;
  kaminoObligation: string;
}

/*
 * Bank Raw DTO
 */

export interface BankRawDto {
  group: string;
  mint: string;
  mintDecimals: number;

  assetShareValue: WrappedI80F48;
  liabilityShareValue: WrappedI80F48;

  liquidityVault: string;
  liquidityVaultBump: number;
  liquidityVaultAuthorityBump: number;

  insuranceVault: string;
  insuranceVaultBump: number;
  insuranceVaultAuthorityBump: number;
  collectedInsuranceFeesOutstanding: WrappedI80F48;

  feeVault: string;
  feeVaultBump: number;
  feeVaultAuthorityBump: number;
  collectedGroupFeesOutstanding: WrappedI80F48;

  lastUpdate: string;

  config: BankConfigRawDto;

  totalLiabilityShares: WrappedI80F48;
  totalAssetShares: WrappedI80F48;

  kaminoReserve: string;
  kaminoObligation: string;

  flags: string;
  emissionsRate: string;
  emissionsRemaining: WrappedI80F48;
  emissionsMint: string;
  feesDestinationAccount?: string;
  lendingPositionCount?: string;
  borrowingPositionCount?: string;

  emode: EmodeSettingsRawDto;
}

export interface BankConfigRawDto {
  assetWeightInit: WrappedI80F48;
  assetWeightMaint: WrappedI80F48;

  liabilityWeightInit: WrappedI80F48;
  liabilityWeightMaint: WrappedI80F48;

  depositLimit: string;
  interestRateConfig: InterestRateConfigRaw;
  operationalState: OperationalStateRaw;

  oracleSetup: OracleSetupRaw;
  oracleKeys: string[];

  borrowLimit: string;
  riskTier: RiskTierRaw;
  assetTag: number;
  configFlags?: number;

  totalAssetValueInitLimit: string;
  oracleMaxAge: number;
  oracleMaxConfidence: number;
  fixedPrice: WrappedI80F48;
}

export interface EmodeSettingsRawDto {
  emodeTag: number;
  timestamp: string;
  flags: string;
  emodeConfig: EmodeConfigRawDto;
}

export interface EmodeConfigRawDto {
  entries: EmodeEntryRawDto[];
}

interface EmodeEntryRawDto {
  collateralBankEmodeTag: number;
  flags: number;
  assetWeightInit: WrappedI80F48;
  assetWeightMaint: WrappedI80F48;
}
