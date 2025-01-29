import React from "react";
import { ArenaPoolV2Extended } from "~/types/trade-store.types";
import { generateTradeStats } from "./utils/stats-utils";
import { cn, TradeActionTxns } from "@mrgnlabs/mrgn-utils";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionStatItem } from "~/components/action-box-v2/components/action-stats/action-stat-item";

interface StatsProps {
  activePool: ArenaPoolV2Extended;
  accountSummary: AccountSummary | null;
  simulationResult: SimulationResult | null;
  actionTxns: TradeActionTxns | null;
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
        <dl className={cn("grid grid-cols-6 gap-y-2 text-xs")}>
          {stats.map((stat, idx) => (
            <ActionStatItem
              key={idx}
              label={stat.label}
              classNames={cn(
                stat.color &&
                  (stat.color === "SUCCESS" ? "text-success" : stat.color === "ALERT" ? "text-alert" : "text-error")
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
