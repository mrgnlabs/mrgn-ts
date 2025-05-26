import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { ActionStatItem } from "~/components/action-box-v2/components";
import {
  getAmountStat,
  getHealthStat,
  getLiquidationStat,
  getPoolSizeStat,
  getBankTypeStat,
  getOracleStat,
  ActionSummary,
  getPriceImpactStat,
  getSlippageStat,
} from "~/components/action-box-v2/utils";

interface PreviewProps {
  selectedBank: ExtendedBankInfo | null;
  isLoading: boolean;

  actionSummary?: ActionSummary;
}

export const Preview = ({ actionSummary, selectedBank, isLoading }: PreviewProps) => {
  const stats = React.useMemo(
    () => (actionSummary && selectedBank ? generateLoopStats(actionSummary, selectedBank, isLoading) : null),
    [actionSummary, isLoading, selectedBank]
  );

  return (
    <>
      {stats && selectedBank && (
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

function generateLoopStats(summary: ActionSummary, bank: ExtendedBankInfo, isLoading: boolean) {
  const stats = [];

  if (summary.actionPreview.priceImpactPct) stats.push(getPriceImpactStat(summary.actionPreview.priceImpactPct));
  if (summary.actionPreview.slippageBps) stats.push(getSlippageStat(summary.actionPreview.slippageBps));

  stats.push(
    getHealthStat(summary.actionPreview.health.computedHealth, false, summary.simulationPreview?.health.computedHealth)
  );

  if (summary.simulationPreview?.liquidationPrice && bank.isActive)
    stats.push(getLiquidationStat(bank, false, summary.simulationPreview?.liquidationPrice));

  stats.push(getBankTypeStat(bank));
  stats.push(getOracleStat(bank));

  return stats;
}
