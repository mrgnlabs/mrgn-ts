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
          <div className="flex flex-col items-start gap-8 pb-16 w-full">
            <div className="grid grid-cols-12 gap-4 w-full h-full lg:gap-8">
              <div className="col-span-9 space-y-8 h-[60vh]">
                <TVWidget symbol={activeGroup.token.info.rawBank.mint.toString()} />
              </div>
              <aside className="col-span-3">
                <TradingBox activeBank={activeGroup.token} />
              </aside>
              <div className="col-span-12 space-y-8">
                <PositionList />
              </div>
            </div>
          </div>
        )}
      </div>
      {previousTxn && <ActionComplete />}
    </>
  );
}
