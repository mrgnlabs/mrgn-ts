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
import { usdFormatter } from "@mrgnlabs/mrgn-common";

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
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
        {(!initialized || !activeGroup) && <Loader label="Loading mrgntrade..." className="mt-8" />}
        {initialized && activeGroup && activeGroup.token && (
          <div className="bg-background-gray-dark p-6 rounded-xl space-y-4">
            <dl className="flex items-center gap-2 text-sm">
              <dt className="text-muted-foreground">Market price</dt>
              <dd>{usdFormatter.format(activeGroup?.token?.info?.oraclePrice.priceRealtime.price.toNumber())}</dd>
              <dt className="ml-4 text-muted-foreground border-l border-muted-foreground/25 pl-4">Oracle price</dt>
              <dd>{usdFormatter.format(activeGroup?.token?.info?.oraclePrice.priceRealtime.price.toNumber())}</dd>
            </dl>
            <div className="flex relative w-full">
              <div className="flex flex-row w-full">
                <div className="flex-4 border border-background-gray-light">
                  <TVWidget token={activeGroup.token} />
                </div>
                <div className="ml-auto max-w-sm w-full flex">
                  <TradingBox activeBank={activeGroup.token} />
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
