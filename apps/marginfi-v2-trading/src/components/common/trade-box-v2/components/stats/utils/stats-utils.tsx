import { MarginRequirementType, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary } from "@mrgnlabs/mrgn-state";
import { percentFormatter, tokenPriceFormatter } from "@mrgnlabs/mrgn-common";
import { TradeActionTxns } from "@mrgnlabs/mrgn-utils";
import Link from "next/link";
import { PreviewStat } from "~/components/action-box-v2/utils";
import { IconPyth } from "~/components/ui/icons";
import { IconSwitchboard } from "~/components/ui/icons";

import { ArenaPoolV2Extended } from "~/types/trade-store.types";

interface generateTradeStatsProps {
  accountSummary: AccountSummary | null;
  extendedPool: ArenaPoolV2Extended;
  simulationResult: SimulationResult | null;
  actionTxns: TradeActionTxns | null;
}

export function generateTradeStats(props: generateTradeStatsProps) {
  const stats: PreviewStat[] = [];

  // entry price stat
  stats.push({
    label: "Price",
    value: () => <>{tokenPriceFormatter(props.extendedPool.tokenBank.info.state.price)}</>,
  });

  if (props.actionTxns) {
    // slippage stat
    const slippageBps = props.actionTxns?.actionQuote?.slippageBps;
    if (slippageBps) {
      stats.push({
        label: "Slippage",
        color: slippageBps > 500 ? "ALERT" : "SUCCESS",
        value: () => <>{percentFormatter.format(slippageBps / 10000)}</>,
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

    if (priceImpactPct !== undefined) {
      stats.push({
        label: "Price impact",
        color: priceImpactPct > 0.05 ? "DESTRUCTIVE" : priceImpactPct > 0.01 ? "ALERT" : "SUCCESS",
        value: () => <>{percentFormatter.format(priceImpactPct)}</>,
      });
    }
  }

  // oracle stat
  let oracle = {
    name: "",
    link: "",
  };

  switch (props.extendedPool.tokenBank.info.rawBank.config.oracleSetup) {
    case "PythLegacy":
      oracle = {
        name: "Pyth",
        link: "https://pyth.network/",
      };
      break;
    case "PythPushOracle":
      oracle = {
        name: "Pyth",
        link: "https://pyth.network/",
      };
      break;
    case "SwitchboardV2":
      oracle = {
        name: "Switchboard",
        link: `https://ondemand.switchboard.xyz/solana/mainnet/feed/${props.extendedPool.tokenBank.info.rawBank.config.oracleKeys[0].toBase58()}`,
      };
      break;
    case "SwitchboardPull":
      oracle = {
        name: "Switchboard",
        link: `https://ondemand.switchboard.xyz/solana/mainnet/feed/${props.extendedPool.tokenBank.info.rawBank.config.oracleKeys[0].toBase58()}`,
      };
      break;
  }
  stats.push({
    label: "Oracle",
    value: () => (
      <>
        <Link href={oracle.link} target="_blank" className="flex items-center gap-1 text-[11px]">
          {oracle.name === "Pyth" ? <IconPyth size={14} /> : <IconSwitchboard size={14} />}
          {oracle.name}
        </Link>
      </>
    ),
  });

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
}
