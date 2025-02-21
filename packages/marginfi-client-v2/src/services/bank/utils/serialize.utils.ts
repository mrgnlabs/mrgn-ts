import { bigNumberToWrappedI80F48 } from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import { BankConfigOptRaw, RiskTierRaw, BankConfigOpt, RiskTier, OperationalState, OracleSetup } from "../types";

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
    freezeSettings: bankConfigOpt.freezeSettings,
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

function serializeOracleSetup(
  oracleSetup: OracleSetup
):
  | { none: {} }
  | { pythLegacy: {} }
  | { switchboardV2: {} }
  | { pythPushOracle: {} }
  | { switchboardPull: {} }
  | { stakedWithPythPush: {} } {
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

export {
  serializeOracleSetupToIndex,
  serializeBankConfigOpt,
  serializeRiskTier,
  serializeOperationalState,
  serializeOracleSetup,
};
