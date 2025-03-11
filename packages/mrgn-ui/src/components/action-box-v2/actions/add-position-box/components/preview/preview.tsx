import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { ActionStatItem } from "~/components/action-box-v2/components";
import {
  getHealthStat,
  getLiquidationStat,
  getBankTypeStat,
  getOracleStat,
  ActionSummary,
  getPriceImpactStat,
  getSlippageStat,
  getPlatformFeeStat,
  getLeverageStat,
  getPositionSizeStat,
} from "~/components/action-box-v2/utils";

interface PreviewProps {
  tokenBank: ExtendedBankInfo;
  quoteBank: ExtendedBankInfo;
  depositAmount: number;
  borrowAmount: number;
  actionSummary?: ActionSummary;
  isLoading: boolean;
}

export const Preview = ({
  actionSummary,
  tokenBank,
  quoteBank,
  depositAmount,
  borrowAmount,
  isLoading,
}: PreviewProps) => {
  const stats = React.useMemo(
    () =>
      actionSummary
        ? generateTradingStats(actionSummary, tokenBank, quoteBank, depositAmount, borrowAmount, isLoading)
        : null,
    [actionSummary, tokenBank, quoteBank, depositAmount, borrowAmount, isLoading]
  );

  return (
    <>
      {stats && (
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

function generateTradingStats(
  summary: ActionSummary,
  tokenBank: ExtendedBankInfo,
  quoteBank: ExtendedBankInfo,
  depositAmount: number,
  borrowAmount: number,
  isLoading: boolean
) {
  const stats = [];

  stats.push(getHealthStat(summary.actionPreview.health, false, summary.simulationPreview?.health));
  stats.push(getLeverageStat(tokenBank, quoteBank, depositAmount, borrowAmount, isLoading));
  stats.push(getPositionSizeStat(tokenBank, quoteBank, depositAmount, borrowAmount, isLoading));
  if (summary.actionPreview.priceImpactPct) stats.push(getPriceImpactStat(summary.actionPreview.priceImpactPct));
  if (summary.actionPreview.slippageBps) stats.push(getSlippageStat(summary.actionPreview.slippageBps));
  if (summary.actionPreview.platformFeeBps) stats.push(getPlatformFeeStat(summary.actionPreview.platformFeeBps));
  if (summary.simulationPreview?.liquidationPrice && tokenBank.isActive)
    stats.push(getLiquidationStat(tokenBank, false, summary.simulationPreview?.liquidationPrice));

  return stats;
}
