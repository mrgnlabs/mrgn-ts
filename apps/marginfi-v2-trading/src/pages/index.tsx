import React from "react";

import { useTradeStore, useUiStore } from "~/store";
import { cn } from "~/utils";

import { PageHeading } from "~/components/common/PageHeading";
import { PoolCard } from "~/components/common/Pool/PoolCard";
import { ActionComplete } from "~/components/common/ActionComplete";
import { PoolSearch } from "~/components/common/Pool";
import { Loader } from "~/components/ui/loader";

export default function HomePage() {
  const [initialized, banks, filteredBanks, resetActiveGroup] = useTradeStore((state) => [
    state.initialized,
    state.banks,
    state.filteredBanks,
    state.resetActiveGroup,
  ]);

  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  const bankList = React.useMemo(() => {
    return filteredBanks.length > 0 ? filteredBanks : banks;
  }, [banks, filteredBanks]);

  React.useEffect(() => {
    resetActiveGroup();
  }, []);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
        {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
        {initialized && (
          <>
            <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
              <PageHeading
                size="lg"
                heading="mrgntrade"
                body={
                  <>
                    <p>Permissionless leverage trading, built on marginfi.</p>
                    <p>Search for tokens or create a new pool.</p>
                  </>
                }
              />
              <div className="flex items-center gap-4">
                <PoolSearch />
              </div>
            </div>

            <div className="w-full space-y-8 px-4 lg:px-8 pt-24 pb-12">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {bankList.length > 0 &&
                  bankList
                    .sort(
                      (a, b) =>
                        b.info.oraclePrice.priceRealtime.price.toNumber() -
                        a.info.oraclePrice.priceRealtime.price.toNumber()
                    )
                    .map((bank, i) => <PoolCard key={i} bank={bank} />)}
              </div>
            </div>
          </>
        )}
      </div>

      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}
