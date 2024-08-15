import { MarginRequirementType, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

/*
  Calculates the health factor of a simulation result.
  The health factor is the ratio of the maintenance assets to the initial assets.
*/
export function simulatedHealthFactor(simulationResult: SimulationResult) {
  const { assets: assetsMaintenance, liabilities: liabilitiesMaintenance } =
    simulationResult.marginfiAccount.computeHealthComponents(MarginRequirementType.Maintenance);
  const { assets: assetsInit } = simulationResult.marginfiAccount.computeHealthComponents(
    MarginRequirementType.Initial
  );

  const health = assetsMaintenance.minus(liabilitiesMaintenance).dividedBy(assetsInit).toNumber();
  return health;
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
export function simulatedCollateral(simulationResult: SimulationResult) {
  const { assets: assetsInit } = simulationResult.marginfiAccount.computeHealthComponents(
    MarginRequirementType.Initial
  );

  const availableCollateral = simulationResult.marginfiAccount.computeFreeCollateral().toNumber();
  return {
    amount: availableCollateral,
    ratio: availableCollateral / assetsInit.toNumber(),
  };
}
