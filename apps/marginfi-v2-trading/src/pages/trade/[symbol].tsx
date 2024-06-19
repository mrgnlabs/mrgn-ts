import React from "react";

import Error from "next/error";
import { useRouter } from "next/router";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";

import { useMrgnlendStore } from "~/store";

import { TVWidget } from "~/components/common/TVWidget";
import { TradingBox } from "~/components/common/TradingBox";
import { Positions } from "~/components/common/Positions";
import { Loader } from "~/components/ui/loader";

export default function TradeSymbolPage() {
  const { query, push } = useRouter();
  const [initialized, extendedBankInfos] = useMrgnlendStore((state) => [state.initialized, state.extendedBankInfos]);
  const [isTokenFound, setIsTokenFound] = React.useState<boolean | null>(null);

  const activeBank = React.useMemo(() => {
    if (!query.symbol) {
      return null;
    }

    try {
      const activeBankPk = new PublicKey(query.symbol);
      return extendedBankInfos.find((bank) => bank.address.equals(activeBankPk)) as ActiveBankInfo;
    } catch (error) {
      setIsTokenFound(false);
      return null;
    }
  }, [extendedBankInfos, query.symbol]);

  if (isTokenFound === false) {
    return <Error statusCode={404} />;
  }

  return (
    <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 z-10">
      {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
      {initialized && (
        <div className="flex flex-col items-start gap-8 pb-16 w-full">
          <div className="grid grid-cols-12 gap-4 w-full h-full lg:gap-8">
            <div className="col-span-9 space-y-8 h-[60vh]">
              <TVWidget symbol={activeBank?.info.state.mint.toString() as string} />
            </div>
            <aside className="col-span-3">
              <TradingBox activeBank={activeBank} />
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
