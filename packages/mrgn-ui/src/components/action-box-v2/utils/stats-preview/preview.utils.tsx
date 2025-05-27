import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { ActionSummary } from "../simulation.utils";
import {
  PreviewStat,
  getHealthStat,
  getLeverageStat,
  getPositionSizeStat,
  getLiquidationStat,
  getPriceImpactStat,
  getSlippageStat,
  getPlatformFeeStat,
} from "./preview-labels.utils";

type PreviewProps = {
  actionSummary: ActionSummary;
  depositBank: ExtendedBankInfo | null;
  borrowBank: ExtendedBankInfo | null;
  depositAmount: number;
  borrowAmount: number;
  isLoading: boolean;
};

export function generateTradingStats({
  actionSummary,
  depositBank,
  borrowBank,
  depositAmount,
  borrowAmount,
  isLoading,
}: PreviewProps): PreviewStat[] {
  const stats: PreviewStat[] = [];

  const hasBanks = !!borrowBank && !!depositBank;

  stats.push(
    getHealthStat(
      actionSummary.actionPreview.health.computedHealth,
      isLoading,
      actionSummary.simulationPreview?.health.computedHealth
    )
  );
  if (hasBanks) {
    stats.push(
      getLeverageStat(
        depositBank,
        borrowBank,
        depositAmount,
        borrowAmount,
        isLoading,
        !!actionSummary.simulationPreview
      )
    );
    stats.push(
      getPositionSizeStat(
        depositBank,
        borrowBank,
        depositAmount,
        borrowAmount,
        isLoading,
        !!actionSummary.simulationPreview
      )
    );
    if (depositBank.isActive)
      stats.push(
        getLiquidationStat(depositBank, isLoading, actionSummary.simulationPreview?.liquidationPrice ?? undefined)
      );
  }
  if (actionSummary.actionPreview.priceImpactPct)
    stats.push(getPriceImpactStat(actionSummary.actionPreview.priceImpactPct));
  if (actionSummary.actionPreview.slippageBps) stats.push(getSlippageStat(actionSummary.actionPreview.slippageBps));
  if (actionSummary.actionPreview.platformFeeBps)
    stats.push(getPlatformFeeStat(actionSummary.actionPreview.platformFeeBps));

  return stats;
}
