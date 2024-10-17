import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { ActionStatItem } from "~/components/action-box-v2/components";
import {
  getPriceImpactStat,
  getSlippageStat,
  getProjectedAPYStat,
  getCurrentPriceStat,
  getCommissionStat,
  getLstSupplyStat,
} from "~/components/action-box-v2/utils";

interface StakeActionSummary {
  actionPreview?: {
    supply: number;
    projectedApy: number;
    currentPrice: number;
    commission: number;
  };
  simulationPreview?: {
    priceImpact?: number;
    splippage?: number;
  };
}

interface StatsPreviewProps {
  selectedBank: ExtendedBankInfo | null;
  isLoading: boolean;
  actionMode: ActionType;
  actionSummary?: StakeActionSummary;
}

export const StatsPreview = ({ actionSummary, selectedBank, isLoading, actionMode }: StatsPreviewProps) => {
  const stats = React.useMemo(
    () => actionSummary && generateStakeStats(actionSummary, isLoading),
    [actionSummary, isLoading]
  );

  return (
    <>
      {stats && (
        <dl className={cn("grid grid-cols-2 gap-y-2 pt-6 text-xs text-white")}>
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

function generateStakeStats(summary: StakeActionSummary, isLoading: boolean) {
  const stats = [];

  if (summary.simulationPreview?.priceImpact) {
    stats.push(getPriceImpactStat(summary.simulationPreview?.priceImpact));
  }

  if (summary.simulationPreview?.splippage) {
    stats.push(getSlippageStat(summary.simulationPreview?.splippage));
  }

  if (summary.actionPreview) {
    stats.push(getLstSupplyStat(summary.actionPreview.supply));
    stats.push(getProjectedAPYStat(summary.actionPreview.projectedApy));
    stats.push(getCurrentPriceStat(summary.actionPreview.currentPrice));
    stats.push(getCommissionStat(summary.actionPreview.commission));
  }

  return stats;
}
