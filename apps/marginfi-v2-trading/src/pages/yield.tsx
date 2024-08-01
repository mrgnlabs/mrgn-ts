import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { groupedNumberFormatterDyn, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore, useUiStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";

import { PageHeading } from "~/components/common/PageHeading";
import { Loader } from "~/components/ui/loader";

export default function PortfolioPage() {
  const [initialized, banks, allBanks, collateralBanks, resetActiveGroup] = useTradeStore((state) => [
    state.initialized,
    state.banks,
    state.banksIncludingUSDC,
    state.collateralBanks,
    state.resetActiveGroup,
  ]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
        {!initialized && <Loader label="Loading portfolio..." className="mt-8" />}
        {initialized && (
          <div className="space-y-4">
            <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
              <PageHeading
                heading="Yield farming"
                body={<p>Nulla veniam tempor duis duis exercitation et ipsum ea consectetur elit mollit.</p>}
                links={[]}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
