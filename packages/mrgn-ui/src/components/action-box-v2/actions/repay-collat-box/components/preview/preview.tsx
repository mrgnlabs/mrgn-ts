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
} from "~/components/action-box-v2/utils";

interface PreviewProps {
  selectedBank: ExtendedBankInfo | null;
  isLoading: boolean;

  actionSummary?: ActionSummary;
}

export const Preview = ({ actionSummary, selectedBank, isLoading }: PreviewProps) => {
  const stats = React.useMemo(
    () => (actionSummary && selectedBank ? generateRepayCollatStats(actionSummary, selectedBank, isLoading) : null),
    [actionSummary, isLoading, selectedBank]
  );

  return (
    <>
      {selectedBank && (
        <dl className={cn("grid grid-cols-2 gap-y-2 pt-6 text-xs text-white")}>
          {stats &&
            stats.map((stat, idx) => (
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

function generateRepayCollatStats(summary: ActionSummary, bank: ExtendedBankInfo, isLoading: boolean) {
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
    stats.push(getLiquidationStat(bank, false, summary.simulationPreview?.liquidationPrice));

  if (summary.actionPreview.bankCap) stats.push(getPoolSizeStat(summary.actionPreview.bankCap, bank, false));
  stats.push(getBankTypeStat(bank));
  stats.push(getOracleStat(bank));

  return stats;
}
