import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import {
  getAmountStat,
  getHealthStat,
  getLiquidationStat,
  getPoolSizeStat,
  getBankTypeStat,
  getOracleStat,
  ActionSummary,
} from "~/components/ActionboxV2/sharedUtils";

export function generateLendingStats(
  summary: ActionSummary,
  bank: ExtendedBankInfo,
  isLending: boolean,
  isLoading: boolean
) {
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

  if (summary.actionPreview.bankCap) stats.push(getPoolSizeStat(summary.actionPreview.bankCap, bank, isLending));
  stats.push(getBankTypeStat(bank));
  stats.push(getOracleStat(bank));

  return stats;
}
