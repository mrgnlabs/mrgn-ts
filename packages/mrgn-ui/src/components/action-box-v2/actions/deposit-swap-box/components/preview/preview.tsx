import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { ActionStatItem } from "~/components/action-box-v2/components";
import type { HidePoolStats } from "~/components/action-box-v2";
import {
  getAmountStat,
  getAmountUsdStat,
  getHealthStat,
  getLiquidationStat,
  getPoolSizeStat,
  getBankTypeStat,
  getOracleStat,
  ActionSummary,
  getSlippageStat,
  getPriceImpactStat,
} from "~/components/action-box-v2/utils";

interface PreviewProps {
  selectedBank: ExtendedBankInfo | null;
  isLoading: boolean;
  lendMode: ActionType;
  actionSummary?: ActionSummary;
  hidePoolStats?: HidePoolStats;
}

export const Preview = ({ actionSummary, selectedBank, isLoading, lendMode, hidePoolStats }: PreviewProps) => {
  const isLending = React.useMemo(
    () => lendMode === ActionType.Deposit || lendMode === ActionType.Withdraw,
    [lendMode]
  );

  const stats = React.useMemo(
    () =>
      actionSummary && selectedBank
        ? generateLendingStats(actionSummary, selectedBank, isLending, isLoading, hidePoolStats)
        : null,
    [actionSummary, selectedBank, isLending, isLoading, hidePoolStats]
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

function generateLendingStats(
  summary: ActionSummary,
  bank: ExtendedBankInfo,
  isLending: boolean,
  isLoading: boolean,
  hidePoolStats?: HidePoolStats
) {
  const stats = [];

  if (summary.actionPreview.priceImpactPct) stats.push(getPriceImpactStat(summary.actionPreview.priceImpactPct));
  if (summary.actionPreview.slippageBps) stats.push(getSlippageStat(summary.actionPreview.slippageBps));

  if (!hidePoolStats?.includes("amount")) {
    stats.push(
      getAmountStat(
        summary.actionPreview.positionAmount,
        bank.meta.tokenSymbol,
        summary.simulationPreview?.positionAmount
      ),
      getAmountUsdStat(
        summary.actionPreview.positionAmount,
        bank.meta.tokenSymbol,
        bank.info.oraclePrice.priceRealtime.price.toNumber(),
        summary.simulationPreview?.positionAmount
      )
    );
  }

  if (!hidePoolStats?.includes("health")) {
    stats.push(getHealthStat(summary.actionPreview.health, false, summary.simulationPreview?.health));
  }

  if (summary.actionPreview.bankCap && !hidePoolStats?.includes("size")) {
    stats.push(getPoolSizeStat(summary.actionPreview.bankCap, bank, isLending));
  }

  if (!hidePoolStats?.includes("oracle")) {
    stats.push(getOracleStat(bank));
  }

  return stats;
}
