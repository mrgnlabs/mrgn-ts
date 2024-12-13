import React from "react";
import { ArenaPoolV2Extended } from "~/store/tradeStoreV2";
import { generateTradeStats } from "./utils/stats-utils";
import { cn, LoopActionTxns } from "@mrgnlabs/mrgn-utils";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionStatItem } from "~/components/action-box-v2/components/action-stats/action-stat-item";

interface StatsProps {
  activePool: ArenaPoolV2Extended;
  accountSummary: AccountSummary | null;
  simulationResult: SimulationResult | null;
  actionTxns: LoopActionTxns | null;
}
export const Stats = ({ activePool, accountSummary, simulationResult, actionTxns }: StatsProps) => {
  const stats = React.useMemo(
    () =>
      generateTradeStats({
        accountSummary: accountSummary,
        extendedPool: activePool,
        simulationResult: simulationResult,
        actionTxns: actionTxns,
      }),
    [activePool, accountSummary, simulationResult, actionTxns]
  );
  return (
    <>
      {stats && (
        <dl className={cn("grid grid-cols-2 gap-y-2 pt-6 text-xs")}>
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
