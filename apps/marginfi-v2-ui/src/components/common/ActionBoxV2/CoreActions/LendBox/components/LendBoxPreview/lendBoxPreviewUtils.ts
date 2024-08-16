import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import {
  getAmountStat,
  getBankTypeStat,
  getHealthStat,
  getLiquidationStat,
  getOracleStat,
  getPoolSizeStat,
} from "~/components/common/ActionBoxV2/sharedUtils";

import { ActionSummary } from "../../utils";

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

  stats.push(getHealthStat(summary.actionPreview.health, isLoading, summary.simulationPreview?.health));

  if (summary.simulationPreview?.liquidationPrice && bank.isActive)
    stats.push(getLiquidationStat(bank, isLoading, summary.simulationPreview?.liquidationPrice));

  stats.push(getPoolSizeStat(summary.actionPreview.bankCap, bank, isLending));
  stats.push(getBankTypeStat(bank));
  stats.push(getOracleStat(bank));

  return stats;
}
