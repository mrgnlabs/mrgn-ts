import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { ActionStatItem } from "~/components/action-box-v2/components";
import {
  getPriceImpactStat,
  getSlippageStat,
  getSupplyStat,
  getProjectedAPYStat,
  getCurrentPriceStat,
  getCommissionStat,
} from "~/components/action-box-v2/utils";

interface StakeActionSummary {
  actionPreview: {
    supply: number;
    projectedApy: number;
    currentPrice: number;
    commission: number;
  };
  simulationPreview?: {
    priceImpact: number;
    splippage: number;
  };
}

interface StatsPreviewProps {
  selectedBank: ExtendedBankInfo | null;
  isLoading: boolean;
  actionMode: ActionType;
  actionSummary?: StakeActionSummary;
}

export const StatsPreview = ({ actionSummary, selectedBank, isLoading, actionMode }: StatsPreviewProps) => {
  const isLending = React.useMemo(
    () => actionMode === ActionType.Deposit || actionMode === ActionType.Withdraw,
    [actionMode]
  );

  const stats = React.useMemo(
    () =>
      actionSummary && selectedBank ? generateStakeStats(actionSummary, selectedBank, isLending, isLoading) : null,
    [actionSummary, selectedBank, isLending, isLoading]
  );

  return (
    <>
      {stats && selectedBank && (
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

function generateStakeStats(
  summary: StakeActionSummary,
  bank: ExtendedBankInfo,
  isLending: boolean,
  isLoading: boolean
) {
  const stats = [];

  if (summary.simulationPreview) {
    stats.push(getPriceImpactStat(summary.simulationPreview?.priceImpact));
    stats.push(getSlippageStat(summary.simulationPreview?.splippage));
  }

  stats.push(getSupplyStat(summary.actionPreview.supply, false, bank.info.state.totalBorrows));
  stats.push(getProjectedAPYStat(summary.actionPreview.projectedApy, false));
  stats.push(getCurrentPriceStat(summary.actionPreview.currentPrice, false));
  stats.push(getCommissionStat(summary.actionPreview.commission));

  return stats;
}
