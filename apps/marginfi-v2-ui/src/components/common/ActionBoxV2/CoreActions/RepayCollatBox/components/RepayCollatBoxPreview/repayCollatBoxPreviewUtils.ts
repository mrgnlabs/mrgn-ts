import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import {
  ActionSummary,
  getAmountStat,
  getBankTypeStat,
  getHealthStat,
  getLiquidationStat,
  getOracleStat,
  getPoolSizeStat,
} from "~/components/common/ActionBoxV2/sharedUtils";

export function generateRepayCollatStats(summary: ActionSummary, bank: ExtendedBankInfo, isLoading: boolean) {
  const stats = [];

  stats.push(
    getAmountStat(
      summary.actionPreview.positionAmount,
      bank.meta.tokenSymbol,
      summary.simulationPreview?.positionAmount
    )
  );

  stats.push(getHealthStat(summary.actionPreview.health, false, summary.simulationPreview?.health));

  if (summary.simulationPreview?.liquidationPrice && bank.isActive)
    stats.push(getLiquidationStat(bank, isLoading, summary.simulationPreview?.liquidationPrice));

  if (summary.actionPreview.bankCap) stats.push(getPoolSizeStat(summary.actionPreview.bankCap, bank, false));
  stats.push(getBankTypeStat(bank));
  stats.push(getOracleStat(bank));

  return stats;
}
