import React from "react";

import { useRouter } from "next/router";

import { useTradeStore, useUiStore } from "~/store";
import { GroupData } from "~/store/tradeStore";
import { useIsMobile } from "~/hooks/use-is-mobile";

import { ActionComplete } from "~/components/common/ActionComplete";
import { TVWidget } from "~/components/common/TVWidget";
import { TradingBox } from "~/components/common/TradingBox";
import { PositionList } from "~/components/common/Portfolio";
import { PoolTradeHeader } from "~/components/common/Pool/PoolTradeHeader";
import { Loader } from "~/components/common/Loader";

export default function TradeSymbolPage() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const side = router.query.side as "long" | "short";
  const [initialized, groupMap] = useTradeStore((state) => [state.initialized, state.groupMap]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);
  const [activeGroup, setActiveGroup] = React.useState<GroupData | null>(null);

  React.useEffect(() => {
    if (!router.isReady || !initialized) return;

    const symbol = router.query.symbol as string;

    if (!symbol) {
      router.push("/404");
      return;
    }

    const group = groupMap.get(symbol);
    if (!group) {
      router.push("/404");
      return;
    }

    setActiveGroup(group);
  }, [router, groupMap, setActiveGroup, initialized]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 pt-8 pb-24 mt:pt-8 md:px-8 min-h-[calc(100vh-100px)]">
        {(!initialized || !activeGroup) && <Loader label="Loading the arena..." className="mt-8" />}
        {initialized && activeGroup && (
          <div className="w-full space-y-4">
            <PoolTradeHeader activeGroup={activeGroup} />
            <div className="rounded-xl space-y-4">
              <div className="flex relative w-full">
                <div className="flex flex-col-reverse w-full gap-4 lg:flex-row">
                  <div className="flex-4 border rounded-xl bg-background overflow-hidden w-full">
                    <TVWidget token={activeGroup.pool.token} />
                  </div>
                  <div className="flex lg:max-w-sm w-full lg:ml-auto">
                    <TradingBox activeGroup={activeGroup} side={side} />
                  </div>
                </div>
              </div>
              {!isMobile && (
                <div className="pt-4">
                  <PositionList activeGroupPk={activeGroup.groupPk} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {previousTxn && <ActionComplete />}
    </>
  );
}
