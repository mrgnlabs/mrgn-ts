import BigNumber from "bignumber.js";
import BN from "bn.js";

import { bigNumberToWrappedI80F48 } from "@mrgnlabs/mrgn-common";

import {
  BankConfigOptRaw,
  RiskTierRaw,
  BankConfigOpt,
  RiskTier,
  OperationalState,
  OracleSetup,
  OracleSetupRaw,
  BankTypeDto,
  BankType,
  EmodeSettingsDto,
  EmodeSettingsType,
  BankConfigType,
  BankConfigDto,
  InterestRateConfigDto,
  InterestRateConfig,
  BankRaw,
  BankRawDto,
  BankConfigRaw,
  BankConfigRawDto,
  EmodeSettingsRaw,
  EmodeSettingsRawDto,
} from "../types";

function serializeBankConfigOpt(bankConfigOpt: BankConfigOpt): BankConfigOptRaw {
  const toWrappedI80F48 = (value: BigNumber | null) => value && bigNumberToWrappedI80F48(value);
  const toBN = (value: BigNumber | null) => value && new BN(value.toString());

  return {
    assetWeightInit: toWrappedI80F48(bankConfigOpt.assetWeightInit),
    assetWeightMaint: toWrappedI80F48(bankConfigOpt.assetWeightMaint),
    liabilityWeightInit: toWrappedI80F48(bankConfigOpt.liabilityWeightInit),
    liabilityWeightMaint: toWrappedI80F48(bankConfigOpt.liabilityWeightMaint),
    depositLimit: toBN(bankConfigOpt.depositLimit),
    borrowLimit: toBN(bankConfigOpt.borrowLimit),
    riskTier: bankConfigOpt.riskTier && serializeRiskTier(bankConfigOpt.riskTier),
    totalAssetValueInitLimit: toBN(bankConfigOpt.totalAssetValueInitLimit),
    assetTag: bankConfigOpt.assetTag !== null ? Number(bankConfigOpt.assetTag) : 0,
    interestRateConfig:
      bankConfigOpt.interestRateConfig &&
      ({
        insuranceFeeFixedApr: toWrappedI80F48(bankConfigOpt.interestRateConfig.insuranceFeeFixedApr),
        maxInterestRate: toWrappedI80F48(bankConfigOpt.interestRateConfig.maxInterestRate),
        insuranceIrFee: toWrappedI80F48(bankConfigOpt.interestRateConfig.insuranceIrFee),
        optimalUtilizationRate: toWrappedI80F48(bankConfigOpt.interestRateConfig.optimalUtilizationRate),
        plateauInterestRate: toWrappedI80F48(bankConfigOpt.interestRateConfig.plateauInterestRate),
        protocolFixedFeeApr: toWrappedI80F48(bankConfigOpt.interestRateConfig.protocolFixedFeeApr),
        protocolIrFee: toWrappedI80F48(bankConfigOpt.interestRateConfig.protocolIrFee),
      } as any),
    operationalState: bankConfigOpt.operationalState && serializeOperationalState(bankConfigOpt.operationalState),
    oracleMaxAge: bankConfigOpt.oracleMaxAge,
    permissionlessBadDebtSettlement: bankConfigOpt.permissionlessBadDebtSettlement,
    freezeSettings: null,
  };
}

function serializeRiskTier(riskTier: RiskTier): RiskTierRaw {
  switch (riskTier) {
    case RiskTier.Collateral:
      return { collateral: {} };
    case RiskTier.Isolated:
      return { isolated: {} };
    default:
      throw new Error(`Invalid risk tier "${riskTier}"`);
  }
}

function serializeOperationalState(
  operationalState: OperationalState
): { paused: {} } | { operational: {} } | { reduceOnly: {} } {
  switch (operationalState) {
    case OperationalState.Paused:
      return { paused: {} };
    case OperationalState.Operational:
      return { operational: {} };
    case OperationalState.ReduceOnly:
      return { reduceOnly: {} };
    default:
      throw new Error(`Invalid operational state "${operationalState}"`);
  }
}

function serializeOracleSetupToIndex(oracleSetup: OracleSetup): number {
  switch (oracleSetup) {
    case OracleSetup.None:
      return 0;
    case OracleSetup.PythLegacy:
      return 1;
    case OracleSetup.SwitchboardV2:
      return 2;
    case OracleSetup.PythPushOracle:
      return 3;
    case OracleSetup.SwitchboardPull:
      return 4;
    case OracleSetup.StakedWithPythPush:
      return 5;
    default:
      return 0;
  }
}

function serializeOracleSetup(oracleSetup: OracleSetup): OracleSetupRaw {
  switch (oracleSetup) {
    case OracleSetup.None:
      return { none: {} };
    case OracleSetup.PythLegacy:
      return { pythLegacy: {} };
    case OracleSetup.SwitchboardV2:
      return { switchboardV2: {} };
    case OracleSetup.PythPushOracle:
      return { pythPushOracle: {} };
    case OracleSetup.SwitchboardPull:
      return { switchboardPull: {} };
    case OracleSetup.StakedWithPythPush:
      return { stakedWithPythPush: {} };
    default:
      throw new Error(`Invalid oracle setup "${oracleSetup}"`);
  }
}

function toBankDto(bank: BankType): BankTypeDto {
  return {
    address: bank.address.toBase58(),
    group: bank.group.toBase58(),
    mint: bank.mint.toBase58(),
    mintDecimals: bank.mintDecimals,
    assetShareValue: bank.assetShareValue.toString(),
    liabilityShareValue: bank.liabilityShareValue.toString(),
    liquidityVault: bank.liquidityVault.toBase58(),
    liquidityVaultBump: bank.liquidityVaultBump,
    liquidityVaultAuthorityBump: bank.liquidityVaultAuthorityBump,
    insuranceVault: bank.insuranceVault.toBase58(),
    insuranceVaultBump: bank.insuranceVaultBump,
    insuranceVaultAuthorityBump: bank.insuranceVaultAuthorityBump,
    collectedInsuranceFeesOutstanding: bank.collectedInsuranceFeesOutstanding.toString(),
    feeVault: bank.feeVault.toBase58(),
    feeVaultBump: bank.feeVaultBump,
    feeVaultAuthorityBump: bank.feeVaultAuthorityBump,
    collectedGroupFeesOutstanding: bank.collectedGroupFeesOutstanding.toString(),
    lastUpdate: bank.lastUpdate,
    config: toBankConfigDto(bank.config),
    totalAssetShares: bank.totalAssetShares.toString(),
    totalLiabilityShares: bank.totalLiabilityShares.toString(),
    emissionsActiveBorrowing: bank.emissionsActiveBorrowing,
    emissionsActiveLending: bank.emissionsActiveLending,
    emissionsRate: bank.emissionsRate,
    emissionsMint: bank.emissionsMint.toBase58(),
    emissionsRemaining: bank.emissionsRemaining.toString(),
    oracleKey: bank.oracleKey.toBase58(),
    pythShardId: bank.pythShardId,
    emode: toEmodeSettingsDto(bank.emode),
    tokenSymbol: bank.tokenSymbol,
    feesDestinationAccount: bank.feesDestinationAccount?.toBase58(),
    lendingPositionCount: bank.lendingPositionCount?.toString(),
    borrowingPositionCount: bank.borrowingPositionCount?.toString(),
  };
}

function toEmodeSettingsDto(emodeSettings: EmodeSettingsType): EmodeSettingsDto {
  return {
    emodeTag: emodeSettings.emodeTag,
    timestamp: emodeSettings.timestamp,
    flags: emodeSettings.flags,
    emodeEntries: emodeSettings.emodeEntries.map((entry) => {
      return {
        collateralBankEmodeTag: entry.collateralBankEmodeTag,
        flags: entry.flags,
        assetWeightInit: entry.assetWeightInit.toString(),
        assetWeightMaint: entry.assetWeightMaint.toString(),
      };
    }),
  };
}

function toBankConfigDto(bankConfig: BankConfigType): BankConfigDto {
  return {
    assetWeightInit: bankConfig.assetWeightInit.toString(),
    assetWeightMaint: bankConfig.assetWeightMaint.toString(),
    liabilityWeightInit: bankConfig.liabilityWeightInit.toString(),
    liabilityWeightMaint: bankConfig.liabilityWeightMaint.toString(),
    depositLimit: bankConfig.depositLimit.toString(),
    borrowLimit: bankConfig.borrowLimit.toString(),
    riskTier: bankConfig.riskTier,
    operationalState: bankConfig.operationalState,
    totalAssetValueInitLimit: bankConfig.totalAssetValueInitLimit.toString(),
    assetTag: bankConfig.assetTag,
    oracleSetup: bankConfig.oracleSetup,
    oracleKeys: bankConfig.oracleKeys.map((key) => key.toBase58()),
    oracleMaxAge: bankConfig.oracleMaxAge,
    interestRateConfig: toInterestRateConfigDto(bankConfig.interestRateConfig),
    configFlags: bankConfig.configFlags,
  };
}

function toInterestRateConfigDto(interestRateConfig: InterestRateConfig): InterestRateConfigDto {
  return {
    optimalUtilizationRate: interestRateConfig.optimalUtilizationRate.toString(),
    plateauInterestRate: interestRateConfig.plateauInterestRate.toString(),
    maxInterestRate: interestRateConfig.maxInterestRate.toString(),
    insuranceFeeFixedApr: interestRateConfig.insuranceFeeFixedApr.toString(),
    insuranceIrFee: interestRateConfig.insuranceIrFee.toString(),
    protocolFixedFeeApr: interestRateConfig.protocolFixedFeeApr.toString(),
    protocolIrFee: interestRateConfig.protocolIrFee.toString(),
    protocolOriginationFee: interestRateConfig.protocolOriginationFee.toString(),
  };
}

export function bankRawToDto(bankRaw: BankRaw): BankRawDto {
  return {
    group: bankRaw.group.toBase58(),
    mint: bankRaw.mint.toBase58(),
    mintDecimals: bankRaw.mintDecimals,

    assetShareValue: bankRaw.assetShareValue,
    liabilityShareValue: bankRaw.liabilityShareValue,

    liquidityVault: bankRaw.liquidityVault.toBase58(),
    liquidityVaultBump: bankRaw.liquidityVaultBump,
    liquidityVaultAuthorityBump: bankRaw.liquidityVaultAuthorityBump,

    insuranceVault: bankRaw.insuranceVault.toBase58(),
    insuranceVaultBump: bankRaw.insuranceVaultBump,
    insuranceVaultAuthorityBump: bankRaw.insuranceVaultAuthorityBump,
    collectedInsuranceFeesOutstanding: bankRaw.collectedInsuranceFeesOutstanding,

    feeVault: bankRaw.feeVault.toBase58(),
    feeVaultBump: bankRaw.feeVaultBump,
    feeVaultAuthorityBump: bankRaw.feeVaultAuthorityBump,
    collectedGroupFeesOutstanding: bankRaw.collectedGroupFeesOutstanding,

    lastUpdate: bankRaw.lastUpdate.toString(),

    config: bankConfigRawToDto(bankRaw.config),

    totalAssetShares: bankRaw.totalAssetShares,
    totalLiabilityShares: bankRaw.totalLiabilityShares,

    flags: bankRaw.flags.toString(),
    emissionsRate: bankRaw.emissionsRate.toString(),
    emissionsRemaining: bankRaw.emissionsRemaining,
    emissionsMint: bankRaw.emissionsMint.toBase58(),
    feesDestinationAccount: bankRaw?.feesDestinationAccount?.toBase58(),
    lendingPositionCount: bankRaw?.lendingPositionCount?.toString(),
    borrowingPositionCount: bankRaw?.borrowingPositionCount?.toString(),

    emode: emodeSettingsRawToDto(bankRaw.emode),
  };
}

export function emodeSettingsRawToDto(emodeSettingsRaw: EmodeSettingsRaw): EmodeSettingsRawDto {
  return {
    emodeTag: emodeSettingsRaw.emodeTag,
    timestamp: emodeSettingsRaw.timestamp.toString(),
    flags: emodeSettingsRaw.flags.toString(),
    emodeConfig: {
      entries: emodeSettingsRaw.emodeConfig.entries.map((entry) => {
        return {
          collateralBankEmodeTag: entry.collateralBankEmodeTag,
          flags: entry.flags,
          assetWeightInit: entry.assetWeightInit,
          assetWeightMaint: entry.assetWeightMaint,
        };
      }),
    },
  };
}

export function bankConfigRawToDto(bankConfigRaw: BankConfigRaw): BankConfigRawDto {
  return {
    assetWeightInit: bankConfigRaw.assetWeightInit,
    assetWeightMaint: bankConfigRaw.assetWeightMaint,
    liabilityWeightInit: bankConfigRaw.liabilityWeightInit,
    liabilityWeightMaint: bankConfigRaw.liabilityWeightMaint,
    depositLimit: bankConfigRaw.depositLimit.toString(),
    borrowLimit: bankConfigRaw.borrowLimit.toString(),
    riskTier: bankConfigRaw.riskTier,
    operationalState: bankConfigRaw.operationalState,
    totalAssetValueInitLimit: bankConfigRaw.totalAssetValueInitLimit.toString(),
    assetTag: bankConfigRaw.assetTag,
    oracleSetup: bankConfigRaw.oracleSetup,
    oracleKeys: bankConfigRaw.oracleKeys.map((key) => key.toBase58()),
    oracleMaxAge: bankConfigRaw.oracleMaxAge,
    interestRateConfig: bankConfigRaw.interestRateConfig,
    configFlags: bankConfigRaw.configFlags,
  };
}

export {
  serializeOracleSetupToIndex,
  serializeBankConfigOpt,
  serializeRiskTier,
  serializeOperationalState,
  serializeOracleSetup,
  toBankDto,
  toEmodeSettingsDto,
  toBankConfigDto,
  toInterestRateConfigDto,
};
