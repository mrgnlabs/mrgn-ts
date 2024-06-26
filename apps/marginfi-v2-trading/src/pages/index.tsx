import React from "react";

import Link from "next/link";

import { useTradeStore, useUiStore } from "~/store";
import { cn } from "~/utils";

import { PageHeading } from "~/components/common/PageHeading";
import { PoolCard } from "~/components/common/Pool/PoolCard";
import { CreatePoolDialog } from "~/components/common/Pool/CreatePoolDialog";
import { ActionComplete } from "~/components/common/ActionComplete";
import { IconSearch, IconSortDescending, IconFilter, IconPlus } from "~/components/ui/icons";
import { Popover, PopoverTrigger, PopoverContent } from "~/components/ui/popover";
import { Loader } from "~/components/ui/loader";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export default function HomePage() {
  const [initialized, banks, resetActiveGroup] = useTradeStore((state) => [
    state.initialized,
    state.banks,
    state.resetActiveGroup,
  ]);

  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    resetActiveGroup();
  }, []);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28">
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
                <div className="relative w-full">
                  <IconSearch
                    size={20}
                    className={cn(
                      "absolute inset-y-0 left-6 h-full text-muted-foreground transition-colors",
                      searchQuery.length && "text-primary"
                    )}
                  />
                  <div className="bg-gradient-to-r from-mrgn-gold/80 to-mrgn-chartreuse/80 rounded-full p-0.5 transition-colors">
                    <Input
                      ref={searchInputRef}
                      placeholder="Search tokens by name, symbol, or mint address..."
                      className="py-3 pr-3 pl-14 h-auto text-xl rounded-full bg-background outline-none focus-visible:ring-primary/75"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full space-y-8 px-4 lg:px-8 pt-24 pb-12">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {banks.length > 0 &&
                  banks
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
