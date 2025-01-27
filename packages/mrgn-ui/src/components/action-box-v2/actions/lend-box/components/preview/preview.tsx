import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
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
} from "~/components/action-box-v2/utils";
import { IconInfoCircle } from "@tabler/icons-react";

interface PreviewProps {
  selectedBank: ExtendedBankInfo | null;
  isLoading: boolean;
  lendMode: ActionType;
  actionSummary?: ActionSummary;
  hidePoolStats?: HidePoolStats;
  isMax?: boolean;
}

export const Preview = ({ actionSummary, selectedBank, isLoading, lendMode, hidePoolStats, isMax }: PreviewProps) => {
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
        <dl className="grid grid-cols-6 gap-y-2 pt-6 text-xs">
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

      {isMax && (
        <small className="flex items-start gap-1 mt-4 text-xs text-muted-foreground font-light max-w-[75%]">
          <IconInfoCircle size={13} className="shrink-0 translate-y-[2px]" />
          Staking rewards accumulated this epoch will be withdrawn to your wallet on deposit.
        </small>
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

  if (summary.simulationPreview?.liquidationPrice && bank.isActive && !hidePoolStats?.includes("liquidation")) {
    stats.push(getLiquidationStat(bank, false, summary.simulationPreview?.liquidationPrice));
  }

  if (summary.actionPreview.bankCap && !hidePoolStats?.includes("size")) {
    stats.push(getPoolSizeStat(summary.actionPreview.bankCap, bank, isLending));
  }

  if (!hidePoolStats?.includes("type")) {
    stats.push(getBankTypeStat(bank));
  }

  if (!hidePoolStats?.includes("oracle")) {
    stats.push(getOracleStat(bank));
  }

  return stats;
}
