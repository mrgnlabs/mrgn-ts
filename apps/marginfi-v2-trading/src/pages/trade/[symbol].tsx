import React from "react";

import { useRouter } from "next/router";

import { PublicKey } from "@solana/web3.js";
import { numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { useTradeStore, useUiStore } from "~/store";
import { cn } from "~/utils";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";

import { ActionComplete } from "~/components/common/ActionComplete";
import { TVWidget, TVWidgetTopBar } from "~/components/common/TVWidget";
import { TradingBox } from "~/components/common/TradingBox";
import { PositionList } from "~/components/common/Portfolio";
import { Loader } from "~/components/ui/loader";

import type { TokenData } from "~/types";

export default function TradeSymbolPage() {
  const router = useRouter();
  const [initialized, activeGroup] = useTradeStore((state) => [state.initialized, state.activeGroup]);
  const side = router.query.side as "long" | "short";
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);
  const [tokenData, setTokenData] = React.useState<TokenData | null>(null);

  React.useEffect(() => {
    if (!activeGroup?.token) return;

    const fetchTokenData = async () => {
      const tokenResponse = await fetch(`/api/birdeye/token?address=${activeGroup.token.info.rawBank.mint.toBase58()}`);

      if (!tokenResponse.ok) {
        console.error("Failed to fetch token data");
        return;
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData) {
        console.error("Failed to parse token data");
        return;
      }

      setTokenData(tokenData);
    };

    fetchTokenData();
  }, [activeGroup]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 pt-4 pb-24 mt:pt-8 md:px-8">
        {(!initialized || !activeGroup) && <Loader label="Loading the arena..." className="mt-8" />}
        {initialized && activeGroup && activeGroup.token && (
          <div className="rounded-xl space-y-4 lg:bg-accent/50 lg:p-6">
            <TVWidgetTopBar tokenData={tokenData} activeGroup={activeGroup} />
            <div className="flex relative w-full">
              <div className="flex flex-col-reverse w-full gap-4 lg:flex-row">
                <div className="flex-4 border rounded-xl overflow-hidden">
                  <TVWidget token={activeGroup.token} />
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
