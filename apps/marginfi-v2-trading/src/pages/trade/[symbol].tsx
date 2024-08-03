import React from "react";

import { useRouter } from "next/router";

import { useTradeStore, useUiStore } from "~/store";

import { ActionComplete } from "~/components/common/ActionComplete";
import { TVWidget, TVWidgetTopBar } from "~/components/common/TVWidget";
import { TradingBox } from "~/components/common/TradingBox";
import { PositionList } from "~/components/common/Portfolio";
import { Loader } from "~/components/ui/loader";

export default function TradeSymbolPage() {
  const router = useRouter();
  const side = router.query.side as "long" | "short";
  const [initialized, activeGroupPk, groupMap] = useTradeStore((state) => [
    state.initialized,
    state.activeGroup,
    state.groupMap,
  ]);

  const activeGroup = React.useMemo(() => {
    return activeGroupPk ? groupMap.get(activeGroupPk.toBase58()) : null;
  }, [activeGroupPk, groupMap]);

  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 pt-4 pb-24 mt:pt-8 md:px-8">
        {(!initialized || !activeGroup) && <Loader label="Loading the arena..." className="mt-8" />}
        {initialized && activeGroup && (
          <div className="rounded-xl space-y-4 lg:bg-accent/50 lg:p-6">
            <TVWidgetTopBar groupData={activeGroup} />
            <div className="flex relative w-full">
              <div className="flex flex-col-reverse w-full gap-4 lg:flex-row">
                <div className="flex-4 border rounded-xl overflow-hidden">
                  <TVWidget token={activeGroup.pool.token} />
                </div>
                <div className="w-full flex lg:max-w-sm lg:ml-auto">
                  <TradingBox side={side} />
                </div>
              </div>
            </div>
            <div className="pt-4">
              <PositionList />
            </div>
          </div>
        )}
      </div>
      {previousTxn && <ActionComplete />}
    </>
  );
}
