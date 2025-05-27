import { MarginRequirementType, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { HealthCache } from "@mrgnlabs/marginfi-client-v2/dist/models/health-cache";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import BigNumber from "bignumber.js";

export enum SimulationStatus {
  IDLE = "idle",
  PREPARING = "preparing",
  SIMULATING = "simulating",
  COMPLETE = "complete",
}

/*
  Calculates the health factor of a simulation result.
  The health factor is the ratio of the maintenance assets to the initial assets.
*/
export function simulatedHealthFactor(simulationResult: SimulationResult) {
  const { assets, liabilities } = simulationResult.marginfiAccount.computeHealthComponents(
    MarginRequirementType.Maintenance
  );

  const { assetValueMaint, liabilityValueMaint } = simulationResult.marginfiAccount.data.healthCache;
  const riskEngineHealth = assetValueMaint.minus(liabilityValueMaint).dividedBy(assetValueMaint).toNumber();

  const computedHealth = assets.minus(liabilities).dividedBy(assets).toNumber();

  return {
    riskEngineHealth,
    computedHealth,
  };
}

/*
  Calculates the position size of a simulation result.
  The position size is the amount of assets or liabilities that the bank has in the position.
*/
export function simulatedPositionSize(simulationResult: SimulationResult, bank: ExtendedBankInfo) {
  const position = simulationResult.marginfiAccount.activeBalances.find(
    (b) => b.active && b.bankPk.equals(bank.address)
  );

  let positionAmount = 0;
  if (position && position.liabilityShares.gt(0)) {
    positionAmount = position.computeQuantityUi(bank.info.rawBank).liabilities.toNumber();
  } else if (position && position.assetShares.gt(0)) {
    positionAmount = position.computeQuantityUi(bank.info.rawBank).assets.toNumber();
  }
  return positionAmount;
}

/*
  Calculates the available collateral of a simulation result.
  The available collateral is the amount of collateral that the bank has available to cover the position.
*/
export function simulatedCollateral(simulationResult: SimulationResult, useRiskEngine = false) {
  if (useRiskEngine) {
    const { assetValue: riskEngineInitAssetValue, liabilityValue: riskEngineInitLiabilityValue } =
      simulationResult.marginfiAccount.data.healthCache;
    const signedFreeCollateral = riskEngineInitAssetValue.minus(riskEngineInitLiabilityValue);
    const availableCollateral = BigNumber.max(0, signedFreeCollateral).toNumber();

    return {
      amount: availableCollateral,
      ratio: availableCollateral / riskEngineInitAssetValue.toNumber(),
    };
  } else {
    const { assets: assetsInit } = simulationResult.marginfiAccount.computeHealthComponents(
      MarginRequirementType.Initial
    );

    const availableCollateral = simulationResult.marginfiAccount.computeFreeCollateral().toNumber();
    return {
      amount: availableCollateral,
      ratio: availableCollateral / assetsInit.toNumber(),
    };
  }
}

export interface ActionSummary {
  actionPreview: ActionPreview;
  simulationPreview: SimulatedActionPreview | null;
}

export interface SimulatedActionPreview {
  health: {
    riskEngineHealth: number;
    computedHealth: number;
  };
  liquidationPrice: number | null;
  depositRate: number;
  borrowRate: number;
  positionAmount: number;
  availableCollateral: {
    ratio: number;
    amount: number;
  };
}

export interface ActionPreview {
  health: {
    riskEngineHealth: number;
    computedHealth: number;
  };
  liquidationPrice: number | null;
  positionAmount: number;
  poolSize?: number;
  bankCap?: number;
  priceImpactPct?: number;
  slippageBps?: number;
  platformFeeBps?: number;
}

export function calculateSimulatedActionPreview(
  simulationResult: SimulationResult,
  bank: ExtendedBankInfo
): SimulatedActionPreview {
  const health = simulatedHealthFactor(simulationResult);
  const positionAmount = simulatedPositionSize(simulationResult, bank);
  const availableCollateral = simulatedCollateral(simulationResult);

  const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBank(bank.address);
  const { lendingRate, borrowingRate } = simulationResult.banks.get(bank.address.toBase58())!.computeInterestRates();

  return {
    health,
    liquidationPrice,
    depositRate: lendingRate.toNumber(),
    borrowRate: borrowingRate.toNumber(),
    positionAmount,
    availableCollateral,
  };
}
