import React from "react";

import { useRouter } from "next/router";

import { useTradeStoreV2, useUiStore } from "~/store";
import { useActionBoxStore } from "~/components/action-box-v2/store";
import { useIsMobile } from "~/hooks/use-is-mobile";

import { ActionComplete } from "~/components/action-complete";
import { ActionComplete as ActionCompleteUi } from "~/components/common/ActionComplete";
import { TVWidget } from "~/components/common/TVWidget";
import { TradingBox } from "~/components/common/TradingBox";
import { PositionList } from "~/components/common/Portfolio";
import { PoolTradeHeader } from "~/components/common/Pool/PoolTradeHeader";
import { Loader } from "~/components/common/Loader";
import { ArenaPoolV2 } from "~/store/tradeStoreV2";
import { GetStaticProps } from "next";
import { StaticArenaProps, getArenaStaticProps } from "~/utils";

export const getStaticProps: GetStaticProps<StaticArenaProps> = async (context) => {
  return getArenaStaticProps(context);
};

export default function TradeSymbolPage({ initialData }: StaticArenaProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const side = router.query.side as "long" | "short";
  const [initialized, arenaPools, fetchArenaGroups, setHydrationComplete] = useTradeStoreV2((state) => [
    state.initialized,
    state.arenaPools,
    state.fetchArenaGroups,
    state.setHydrationComplete,
  ]);
  const [isActionComplete, previousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.isActionComplete,
    state.previousTxn,
    state.setIsActionComplete,
  ]);
  const [previousTxnUi] = useUiStore((state) => [state.previousTxn]);
  const [activePool, setActivePool] = React.useState<ArenaPoolV2 | null>(null);

  React.useEffect(() => {
    if (initialData) {
      fetchArenaGroups(initialData);
      setHydrationComplete();
    }
  }, [initialData, fetchArenaGroups, setHydrationComplete]);

  React.useEffect(() => {
    if (!router.isReady || !initialized) return;

    const symbol = router.query.symbol as string;

    if (!symbol) {
      router.push("/404");
      return;
    }

    const group = arenaPools[symbol];
    if (!group) {
      router.push("/404");
      return;
    }

    setActivePool(group);
  }, [router, arenaPools, setActivePool, initialized]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 pt-8 pb-24 mt:pt-8 md:px-8 min-h-[calc(100vh-100px)]">
        {(!initialized || !activePool) && <Loader label="Loading the arena..." className="mt-8" />}
        {initialized && activePool && (
          <div className="w-full space-y-4">
            <PoolTradeHeader activePool={activePool} />
            <div className="rounded-xl space-y-4">
              <div className="flex relative w-full">
                <div className="flex flex-col-reverse w-full gap-4 lg:flex-row">
                  <div className="flex-4 border rounded-xl bg-background overflow-hidden w-full">
                    <TVWidget activePool={activePool} />
                  </div>
                  <div className="flex lg:max-w-sm w-full lg:ml-auto">
                    <TradingBox activePool={activePool} side={side} />
                  </div>
                </div>
              </div>
              {!isMobile && (
                <div className="pt-4">
                  <PositionList activePool={activePool} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {initialized && previousTxn && (
        <ActionComplete
          isActionComplete={isActionComplete}
          setIsActionComplete={setIsActionComplete}
          previousTxn={previousTxn}
        />
      )}
      {initialized && previousTxnUi && <ActionCompleteUi />}
    </>
  );
}
