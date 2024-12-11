import React from "react";
import { ArenaPoolV2Extended } from "~/store/tradeStoreV2";

interface StatsProps {
  activePool: ArenaPoolV2Extended;
}
export const Stats = ({ activePool }: StatsProps) => {
  React.useEffect(() => {
    if (activePool) {
      // generateStats(
      //   activeGroup.accountSummary,
      //   activeGroup.pool.token,
      //   activeGroup.pool.quoteTokens[0],
      //   null,
      //   null,
      //   false
      // );
    }
  }, [activePool]);
  return <div>Stats</div>;
};
