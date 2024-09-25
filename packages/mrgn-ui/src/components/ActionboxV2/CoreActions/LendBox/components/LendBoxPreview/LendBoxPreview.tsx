import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { cn } from "~/utils/themeUtils";
import { ActionStatItem } from "../../../../../ActionboxV2/sharedComponents";

import { useLendBoxStore } from "../../store";
import { ActionSummary } from "../../utils";
import { generateLendingStats } from "./lendBoxPreviewUtils";

interface LendBoxPreviewProps {
  actionSummary?: ActionSummary;
}

export const LendBoxPreview = ({ actionSummary }: LendBoxPreviewProps) => {
  const [selectedBank, isLoading, lendMode] = useLendBoxStore((state) => [
    state.selectedBank,
    state.isLoading,
    state.lendMode,
  ]);

  const isLending = React.useMemo(
    () => lendMode === ActionType.Deposit || lendMode === ActionType.Withdraw,
    [lendMode]
  );

  const stats = React.useMemo(
    () =>
      actionSummary && selectedBank ? generateLendingStats(actionSummary, selectedBank, isLending, isLoading) : null,
    [actionSummary, selectedBank, isLending, isLoading]
  );

  return (
    <dl className={cn("grid grid-cols-2 gap-y-2 pt-6 text-xs text-white")}>
      {selectedBank &&
        stats &&
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
  );
};
