import { MarginRequirementType, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { LoopActionTxns } from "@mrgnlabs/mrgn-utils";

import { ArenaPoolV2Extended } from "~/store/tradeStoreV2";

interface generateTradeStatsProps {
  accountSummary: AccountSummary;
  extendedPool: ArenaPoolV2Extended;
  simulationResult: SimulationResult | null;
  actionTxns: LoopActionTxns;
}

export function generateTradeStats(props: generateTradeStatsProps) {
  let simStats = null;

  if (props.simulationResult) {
    simStats = getSimulationStats(props.simulationResult, props.extendedPool);
  }

  const stats = [];
}

export function getSimulationStats(simulationResult: SimulationResult, extendedPool: ArenaPoolV2Extended) {
  const { assets, liabilities } = simulationResult.marginfiAccount.computeHealthComponents(
    MarginRequirementType.Maintenance
  );
  const { assets: assetsInit } = simulationResult.marginfiAccount.computeHealthComponents(
    MarginRequirementType.Initial
  );

  const healthFactor = assets.minus(liabilities).dividedBy(assets).toNumber();
  const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBank(
    extendedPool.tokenBank.address
  );
  // const { lendingRate, borrowingRate } = simulationResult.banks.get(bank.address.toBase58())!.computeInterestRates();

  // Token position
  const tokenPosition = simulationResult.marginfiAccount.activeBalances.find(
    (b) => b.active && b.bankPk.equals(extendedPool.tokenBank.address)
  );
  let tokenPositionAmount = 0;
  if (tokenPosition && tokenPosition.liabilityShares.gt(0)) {
    tokenPositionAmount = tokenPosition.computeQuantityUi(extendedPool.tokenBank.info.rawBank).liabilities.toNumber();
  } else if (tokenPosition && tokenPosition.assetShares.gt(0)) {
    tokenPositionAmount = tokenPosition.computeQuantityUi(extendedPool.tokenBank.info.rawBank).assets.toNumber();
  }

  // usdc position
  const usdcPosition = simulationResult.marginfiAccount.activeBalances.find(
    (b) => b.active && b.bankPk.equals(extendedPool.quoteBank.address)
  );
  let usdcPositionAmount = 0;
  if (usdcPosition && usdcPosition.liabilityShares.gt(0)) {
    usdcPositionAmount = usdcPosition.computeQuantityUi(extendedPool.quoteBank.info.rawBank).liabilities.toNumber();
  } else if (usdcPosition && usdcPosition.assetShares.gt(0)) {
    usdcPositionAmount = usdcPosition.computeQuantityUi(extendedPool.quoteBank.info.rawBank).assets.toNumber();
  }

  const availableCollateral = simulationResult.marginfiAccount.computeFreeCollateral().toNumber();

  return {
    tokenPositionAmount,
    usdcPositionAmount,
    healthFactor,
    liquidationPrice,
  };
} // TODO: check if this is correct, copy pasted old code

export function getCurrentStats(accountSummary: AccountSummary, extendedPool: ArenaPoolV2Extended) {
  const tokenPositionAmount = extendedPool.tokenBank?.isActive ? extendedPool.tokenBank.position.amount : 0;
  const usdcPositionAmount = extendedPool.quoteBank?.isActive ? extendedPool.quoteBank.position.amount : 0;
  const healthFactor = !accountSummary.balance || !accountSummary.healthFactor ? 1 : accountSummary.healthFactor;

  // always token asset liq price
  const liquidationPrice =
    extendedPool.tokenBank.isActive &&
    extendedPool.tokenBank.position.liquidationPrice &&
    extendedPool.tokenBank.position.liquidationPrice > 0.01
      ? extendedPool.tokenBank.position.liquidationPrice
      : null;

  return {
    tokenPositionAmount,
    usdcPositionAmount,
    healthFactor,
    liquidationPrice,
  };
}
