import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { ActionStatItem } from "~/components/common/ActionBoxV2/sharedComponents";
import { cn } from "~/utils";

import { useLendBoxStore } from "../../store";

import { generateLendingStats } from "./lendBoxPreviewUtils";

interface LendBoxPreviewProps {}

export const LendBoxPreview = ({}: LendBoxPreviewProps) => {
  const [actionSummary, selectedBank, isLoading, lendMode] = useLendBoxStore((state) => [
    state.actionSummary,
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
    <>
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
    </>
  );
};
