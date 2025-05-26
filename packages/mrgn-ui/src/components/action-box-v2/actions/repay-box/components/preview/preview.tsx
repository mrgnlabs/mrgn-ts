import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { ActionStatItem } from "~/components/action-box-v2/components";
import {
  getAmountStat,
  getAmountUsdStat,
  getHealthStat,
  getLiquidationStat,
  getPoolSizeStat,
  getBankTypeStat,
  getOracleStat,
  ActionSummary,
  getPriceImpactStat,
  getSlippageStat,
  PreviewStat,
} from "~/components/action-box-v2/utils";

export type PreviewProps = {
  actionSummary: ActionSummary;
  depositBank: ExtendedBankInfo | null;
  borrowBank: ExtendedBankInfo | null;
  depositAmount: number;
  borrowAmount: number;
  isLoading: boolean;
  overrideStats?: (props: PreviewProps) => PreviewStat[];
};

export const Preview = ({
  actionSummary,
  depositBank,
  borrowBank,
  depositAmount,
  borrowAmount,
  isLoading,
  overrideStats,
}: PreviewProps) => {
  const stats = React.useMemo(
    () =>
      actionSummary && depositBank && borrowBank
        ? overrideStats
          ? overrideStats({ actionSummary, depositBank, borrowBank, depositAmount, borrowAmount, isLoading })
          : generateRepayCollatStats(actionSummary, depositBank)
        : null,
    [actionSummary, depositBank, borrowBank, overrideStats, depositAmount, borrowAmount, isLoading]
  );

  return (
    <>
      {stats && depositBank && borrowBank && (
        <dl className={cn("grid grid-cols-6 gap-y-2 pt-6 text-xs")}>
          {stats.map((stat, idx) => (
            <ActionStatItem
              key={idx}
              label={stat.label}
              classNames={cn(
                stat.color &&
                  (stat.color === "SUCCESS"
                    ? "text-success"
                    : stat.color === "ALERT"
                      ? "text-alert-foreground"
                      : "text-destructive-foreground")
              )}
            >
              <stat.value />
            </ActionStatItem>
          ))}
        </dl>
      )}
    </>
  );
};

function generateRepayCollatStats(summary: ActionSummary, bank: ExtendedBankInfo): PreviewStat[] {
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
    getHealthStat(summary.actionPreview.health.computedHealth, false, summary.simulationPreview?.health.computedHealth)
  );

  if (summary.simulationPreview?.liquidationPrice && bank.isActive)
    stats.push(getLiquidationStat(bank, false, summary.simulationPreview?.liquidationPrice));

  if (summary.actionPreview.bankCap) stats.push(getPoolSizeStat(summary.actionPreview.bankCap, bank, false));
  stats.push(getBankTypeStat(bank));
  stats.push(getOracleStat(bank));

  return stats;
}
