import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { ActionStatItem } from "~/components/common/ActionBoxV2/sharedComponents";
import { cn } from "~/utils";

import { useRepayCollatBoxStore } from "../../store";

import { generateRepayCollatStats } from "./repayCollatBoxPreviewUtils";
import { ActionSummary } from "~/components/common/ActionBoxV2/sharedUtils";

interface RepayCollatBoxPreviewProps {
  actionSummary?: ActionSummary;
}

export const RepayCollatBoxPreview = ({ actionSummary }: RepayCollatBoxPreviewProps) => {
  const [selectedBank, isLoading] = useRepayCollatBoxStore((state) => [state.selectedBank, state.isLoading]);

  const stats = React.useMemo(
    () => (actionSummary && selectedBank ? generateRepayCollatStats(actionSummary, selectedBank, isLoading) : null),
    [actionSummary, isLoading, selectedBank]
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
