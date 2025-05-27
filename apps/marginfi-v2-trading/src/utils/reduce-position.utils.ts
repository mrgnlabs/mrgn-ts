import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionSummary,
  PreviewStat,
  getAmountStat,
  getAmountUsdStat,
  getPriceImpactStat,
  getSlippageStat,
  getHealthStat,
  getLiquidationStat,
  getPoolSizeStat,
  getBankTypeStat,
  getOracleStat,
} from "~/components/action-box-v2/utils";

function generateReducePositionStats(summary: ActionSummary, bank: ExtendedBankInfo): PreviewStat[] {
  const stats = [];

  stats.push(
    getAmountStat(
      summary.actionPreview.positionAmount,
      bank.meta.tokenSymbol,
      summary.simulationPreview?.positionAmount
    )
  );
  stats.push(
    getAmountUsdStat(
      summary.actionPreview.positionAmount,
      bank.meta.tokenSymbol,
      bank.info.oraclePrice.priceRealtime.price.toNumber(),
      summary.simulationPreview?.positionAmount
    )
  );
  if (summary.actionPreview.priceImpactPct) stats.push(getPriceImpactStat(summary.actionPreview.priceImpactPct));
  if (summary.actionPreview.slippageBps) stats.push(getSlippageStat(summary.actionPreview.slippageBps));

  stats.push(
    getHealthStat(summary.actionPreview.health.computedHealth, false, summary.simulationPreview?.health?.computedHealth)
  );

  if (summary.simulationPreview?.liquidationPrice && bank.isActive)
    stats.push(getLiquidationStat(bank, false, summary.simulationPreview?.liquidationPrice));

  if (summary.actionPreview.bankCap) stats.push(getPoolSizeStat(summary.actionPreview.bankCap, bank, false));
  stats.push(getBankTypeStat(bank));
  stats.push(getOracleStat(bank));

  return stats;
}
