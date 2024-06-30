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
  const { connection } = useConnection();
  const { wallet } = useWalletContext();
  const [initialized, activeGroup, setActiveBank] = useTradeStore((state) => [
    state.initialized,
    state.activeGroup,
    state.setActiveBank,
  ]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);
  const [tokenData, setTokenData] = React.useState<TokenData | null>(null);

  React.useEffect(() => {
    if (!router.query.symbol || !wallet || !connection || activeGroup) return;
    const symbol = router.query.symbol as string;
    setActiveBank({ bankPk: new PublicKey(symbol), connection, wallet });
  }, [router.query.symbol, wallet, connection, activeGroup, setActiveBank]);

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

      console.log(tokenData);

      setTokenData(tokenData);
    };

    fetchTokenData();
  }, [activeGroup]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
        {(!initialized || !activeGroup) && <Loader label="Loading mrgntrade..." className="mt-8" />}
        {initialized && activeGroup && activeGroup.token && (
          <div className="bg-background-gray-dark p-6 rounded-xl space-y-4">
            <TVWidgetTopBar tokenData={tokenData} activeGroup={activeGroup} />
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
