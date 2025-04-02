import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn } from "@mrgnlabs/mrgn-utils";

import { ActionStatItem } from "~/components/action-box-v2/components";
import { ActionSummary, generateTradingStats } from "~/components/action-box-v2/utils";

interface PreviewProps {
  depositBank: ExtendedBankInfo;
  borrowBank: ExtendedBankInfo;
  depositAmount: number;
  borrowAmount: number;
  actionSummary?: ActionSummary;
  isLoading: boolean;
}

export const Preview = ({
  actionSummary,
  depositBank,
  borrowBank,
  depositAmount,
  borrowAmount,
  isLoading,
}: PreviewProps) => {
  const stats = React.useMemo(
    () =>
      actionSummary
        ? generateTradingStats({ actionSummary, depositBank, borrowBank, depositAmount, borrowAmount, isLoading })
        : null,
    [actionSummary, depositBank, borrowBank, depositAmount, borrowAmount, isLoading]
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
                      : stat.color === "DESTRUCTIVE"
                        ? "text-alert-foreground"
                        : "text-primary-foreground")
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
