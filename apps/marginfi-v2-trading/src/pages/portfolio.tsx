import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { PositionCard } from "~/components/common/Portfolio/PositionCard";
import { Loader } from "~/components/ui/loader";

import type { Position } from "~/types";

type Portfolio = {
  long: Position[];
  short: Position[];
} | null;

export default function PortfolioPage() {
  const [initialized, extendedBankInfos] = useMrgnlendStore((state) => [state.initialized, state.extendedBankInfos]);

  const portfolio: Portfolio = React.useMemo(() => {
    const bonk = extendedBankInfos?.find((bank) => bank.meta.tokenSymbol === "Bonk");
    const wif = extendedBankInfos?.find((bank) => bank.meta.tokenSymbol === "$WIF");
    const boden = extendedBankInfos?.find((bank) => bank.meta.tokenSymbol === "BODEN");

    if (!bonk || !wif || !boden) {
      return null;
    }

    return {
      long: [
        {
          bank: bonk,
          type: "long",
          size: 100,
          leverage: 5,
          entryPrice: 100,
          markPrice: 110,
          liquidationPrice: 90,
          pnl: +10,
        },

        {
          bank: boden,
          type: "long",
          size: 100,
          leverage: 5,
          entryPrice: 100,
          markPrice: 100,
          liquidationPrice: 90,
          pnl: +15,
        },
      ],
      short: [
        {
          bank: wif,
          type: "short",
          size: 100,
          leverage: 5,
          entryPrice: 100,
          markPrice: 90,
          liquidationPrice: 110,
          pnl: -5,
        },
      ],
    };
  }, [extendedBankInfos]);

  return (
    <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28">
      {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
      {initialized && (
        <div className="space-y-4">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
            <PageHeading heading={<h1>Portfolio</h1>} body={<p>Manage your mrgntrade positions.</p>} links={[]} />
          </div>
          <div className="bg-background-gray-dark p-4 rounded-2xl w-full max-w-6xl mx-auto md:p-8">
            {!portfolio ? (
              <div>No positions.</div>
            ) : (
              <div className="grid grid-cols-1 gap-12 w-full md:grid-cols-2">
                <div className="space-y-6">
                  <h2 className="text-2xl font-medium">Long positions</h2>
                  <div className="space-y-8">
                    {portfolio.long.map((position, index) => (
                      <PositionCard key={index} position={position} />
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <h2 className="text-2xl font-medium">Short positions</h2>
                  <div className="space-y-8">
                    {portfolio.short.map((position, index) => (
                      <PositionCard key={index} position={position} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
