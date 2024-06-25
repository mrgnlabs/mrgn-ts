import React from "react";

import { useRouter } from "next/router";

import { PublicKey } from "@solana/web3.js";

import { useTradeStore, useUiStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";

import { ActionComplete } from "~/components/common/ActionComplete";
import { TVWidget } from "~/components/common/TVWidget";
import { TradingBox } from "~/components/common/TradingBox";
import { PositionList } from "~/components/common/Portfolio";
import { Loader } from "~/components/ui/loader";

export default function TradeSymbolPage() {
  const router = useRouter();
  const { connection } = useConnection();
  const { wallet } = useWalletContext();
  const [initialized, activeGroup, setActiveBank, marginfiClient] = useTradeStore((state) => [
    state.initialized,
    state.activeGroup,
    state.setActiveBank,
    state.marginfiClient,
  ]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  React.useEffect(() => {
    if (!router.query.symbol || !wallet || !connection || activeGroup) return;
    const symbol = router.query.symbol as string;
    setActiveBank({ bankPk: new PublicKey(symbol), connection, wallet });
  }, [router.query.symbol, wallet, connection, activeGroup]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 z-10">
        {(!initialized || !activeGroup) && <Loader label="Loading mrgntrade..." className="mt-8" />}
        {initialized && activeGroup && activeGroup.token && (
          <div className="space-y-10">
            <div>
              <div>
                <dt>Oracle price</dt>
                <dd>{activeGroup?.token?.info?.oraclePrice.priceRealtime.price.toString()}</dd>
              </div>{" "}
            </div>
            <div className="relative h-[600px] w-full bg-background-gray ">
              <div className="flex flex-row w-full">
                <div className="w-full flex-4 h-[600px]">
                  <TVWidget token={activeGroup.token} />
                </div>
                <div className="max-w-[380px] px-10">
                  <TradingBox activeBank={activeGroup.token} />{" "}
                </div>
              </div>
            </div>
            <PositionList />
          </div>
        )}
      </div>
      {previousTxn && <ActionComplete />}
    </>
  );
}
