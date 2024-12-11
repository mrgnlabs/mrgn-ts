import { MarginRequirementType, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { percentFormatter, tokenPriceFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { LoopActionTxns } from "@mrgnlabs/mrgn-utils";
import { IconArrowRight } from "@tabler/icons-react";
import { PreviewStat } from "~/components/action-box-v2/utils";
import { IconPyth } from "~/components/ui/icons";
import { IconSwitchboard } from "~/components/ui/icons";

import { ArenaPoolV2Extended } from "~/store/tradeStoreV2";

interface generateTradeStatsProps {
  accountSummary: AccountSummary | null;
  extendedPool: ArenaPoolV2Extended;
  simulationResult: SimulationResult | null;
  actionTxns: LoopActionTxns | null;
}

export function generateTradeStats(props: generateTradeStatsProps) {
  const stats: PreviewStat[] = [];

  // entry price stat
  stats.push({
    label: "Entry price",
    value: () => <>{tokenPriceFormatter(props.extendedPool.tokenBank.info.state.price)}</>,
  });

  // simulation stat
  if (props.simulationResult) {
    const simStats = getSimulationStats(props.simulationResult, props.extendedPool);
    const currentLiquidationPrice =
      props.extendedPool.tokenBank.isActive &&
      props.extendedPool.tokenBank.position.liquidationPrice &&
      props.extendedPool.tokenBank.position.liquidationPrice > 0.01
        ? usdFormatter.format(props.extendedPool.tokenBank.position.liquidationPrice)
        : null;
    const simulatedLiqPrice = simStats?.liquidationPrice ? usdFormatter.format(simStats?.liquidationPrice) : null;
    const showLiqComparison = currentLiquidationPrice && simulatedLiqPrice;
    stats.push({
      label: "Liquidation price",
      value: () => (
        <>
          {currentLiquidationPrice && <span>{currentLiquidationPrice}</span>}
          {showLiqComparison && <IconArrowRight width={12} height={12} />}
          {simulatedLiqPrice && <span>{simulatedLiqPrice}</span>}
        </>
      ),
    });
  }

  // platform fee stat
  const platformFeeBps = props.actionTxns?.actionQuote?.platformFee
    ? Number(props.actionTxns.actionQuote.platformFee?.feeBps)
    : undefined;
  if (platformFeeBps) {
    stats.push({
      label: "Platform fee",
      value: () => <>{percentFormatter.format(platformFeeBps / 10000)}</>,
    });
  }

  // price impact stat
  const priceImpactPct = props.actionTxns?.actionQuote
    ? Number(props.actionTxns.actionQuote.priceImpactPct)
    : undefined;
  if (priceImpactPct) {
    stats.push({
      label: "Price impact",
      color: priceImpactPct > 0.05 ? "DESTRUCTIVE" : priceImpactPct > 0.01 ? "ALERT" : "SUCCESS",
      value: () => <>{percentFormatter.format(priceImpactPct)}</>,
    });
  }

  // oracle stat
  let oracle = "";
  switch (props.extendedPool.tokenBank.info.rawBank.config.oracleSetup) {
    case "PythLegacy":
      oracle = "Pyth";
      break;
    case "PythPushOracle":
      oracle = "Pyth";
      break;
    case "SwitchboardV2":
      oracle = "Switchboard";
      break;
  }
  stats.push({
    label: "Oracle",
    value: () => (
      <>
        {oracle}
        {oracle === "Pyth" ? <IconPyth size={14} /> : <IconSwitchboard size={14} />}
      </>
    ),
  });

  const accountSummary = props.accountSummary;
  if (accountSummary) {
    // total deposits stat
    stats.push({
      label: "Total deposits",
      value: () => (
        <>
          {props.extendedPool.tokenBank.info.state.totalDeposits.toFixed(2)}{" "}
          {props.extendedPool.tokenBank.meta.tokenSymbol}
        </>
      ),
    });

    // total borrows stat
    stats.push({
      label: "Total borrows",
      value: () => (
        <>
          {props.extendedPool.tokenBank.info.state.totalBorrows.toFixed(2)}{" "}
          {props.extendedPool.tokenBank.meta.tokenSymbol}
        </>
      ),
    });
  }

  return stats;
}

export function getSimulationStats(simulationResult: SimulationResult, extendedPool: ArenaPoolV2Extended) {
  const { assets, liabilities } = simulationResult.marginfiAccount.computeHealthComponents(
    MarginRequirementType.Maintenance
  );

  const healthFactor = assets.minus(liabilities).dividedBy(assets).toNumber();
  const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBank(
    extendedPool.tokenBank.address
  );

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

  // quote position
  const quotePosition = simulationResult.marginfiAccount.activeBalances.find(
    (b) => b.active && b.bankPk.equals(extendedPool.quoteBank.address)
  );
  let quotePositionAmount = 0;
  if (quotePosition && quotePosition.liabilityShares.gt(0)) {
    quotePositionAmount = quotePosition.computeQuantityUi(extendedPool.quoteBank.info.rawBank).liabilities.toNumber();
  } else if (quotePosition && quotePosition.assetShares.gt(0)) {
    quotePositionAmount = quotePosition.computeQuantityUi(extendedPool.quoteBank.info.rawBank).assets.toNumber();
  }

  return {
    tokenPositionAmount,
    quotePositionAmount,
    healthFactor,
    liquidationPrice,
  };
} // TODO: a lot of this code is copy pasted from old code, need to clean up
