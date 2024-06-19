import React from "react";

import Error from "next/error";
import { useRouter } from "next/router";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";

import { useTradeStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";

import { TVWidget } from "~/components/common/TVWidget";
import { TradingBox } from "~/components/common/TradingBox";
import { Positions } from "~/components/common/Positions";
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

  React.useEffect(() => {
    if (!router.query.symbol) return;
    const symbol = router.query.symbol as string;
    setActiveBank({ bankPk: new PublicKey(symbol), connection, wallet });
  }, [router.query.symbol]);

  console.log("activeGroup", activeGroup);

  return (
    <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 z-10">
      {(!initialized || !activeGroup) && <Loader label="Loading mrgntrade..." className="mt-8" />}
      {initialized && activeGroup && (
        <div className="flex flex-col items-start gap-8 pb-16 w-full">
          <div className="grid grid-cols-12 gap-4 w-full h-full lg:gap-8">
            <div className="col-span-9 space-y-8 h-[60vh]">
              <TVWidget symbol={activeGroup.token.info.rawBank.mint.toString()} />
            </div>
            <aside className="col-span-3">
              <TradingBox activeBank={activeGroup.token} />
            </aside>
            <div className="col-span-12 space-y-8">
              <Positions />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
