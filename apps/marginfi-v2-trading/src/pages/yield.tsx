import React from "react";

import Fuse from "fuse.js";
import { IconSortDescending, IconSortAscending, IconSearch } from "@tabler/icons-react";

import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2 } from "~/store";
import { TradePoolFilterStates } from "~/store/tradeStoreV2";
import { useActionBoxStore } from "~/components/action-box-v2/store";
import { cn } from "@mrgnlabs/mrgn-utils";
import { useIsMobile } from "~/hooks/use-is-mobile";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { ActionComplete } from "~/components/action-complete";
import { PageHeading } from "~/components/common/PageHeading";
import { Loader } from "~/components/common/Loader";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { YieldRow } from "~/components/common/Yield";
import { YieldCard } from "~/components/common/Yield/YieldCard";
import { ArenaPoolV2Extended } from "~/store/tradeStoreV2";
import { useExtendedPools } from "~/hooks/useExtendedPools";

const sortOptions: {
  value: TradePoolFilterStates;
  label: string;
  dir?: "asc" | "desc";
}[] = [
  { value: TradePoolFilterStates.APY_DESC, label: "APY Desc" },
  { value: TradePoolFilterStates.APY_ASC, label: "APY Asc", dir: "asc" },
  { value: TradePoolFilterStates.LIQUIDITY_DESC, label: "Liquidity Desc" },
  { value: TradePoolFilterStates.LIQUIDITY_ASC, label: "Liquidity Asc", dir: "asc" },
];

export default function YieldPage() {
  const [initialized, sortBy, setSortBy] = useTradeStoreV2((state) => [
    state.initialized,
    state.sortBy,
    state.setSortBy,
  ]);

  const extendedPools = useExtendedPools();

  const [isActionComplete, previousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.isActionComplete,
    state.previousTxn,
    state.setIsActionComplete,
  ]);

  const fuse = React.useMemo(() => {
    return new Fuse(extendedPools, {
      includeScore: true,
      threshold: 0.2,
      keys: [
        {
          name: "tokenBank.meta.tokenSymbol",
          weight: 0.7,
        },
        {
          name: "quoteBank.meta.tokenSymbol",
          weight: 0.7,
        },
        {
          name: "tokenBank.meta.tokenName",
          weight: 0.3,
        },
        {
          name: "quoteBank.meta.tokenName",
          weight: 0.3,
        },
        {
          name: "tokenBank.info.state.mint.toBase58()",
          weight: 0.1,
        },
        {
          name: "quoteBank.info.state.mint.toBase58()",
          weight: 0.1,
        },
      ],
    });
  }, [extendedPools]);

  const isMobile = useIsMobile();
  const { connected } = useWallet();
  const [search, setSearch] = React.useState("");

  const searchRef = React.useRef<HTMLDivElement>(null);

  const dir = React.useMemo(() => {
    const option = sortOptions.find((option) => option.value === sortBy);
    return option?.dir || "desc";
  }, [sortBy]);

  const filteredPools = React.useMemo(() => {
    if (!fuse) return extendedPools;
    const results = fuse.search(search).map((result) => result.item);
    if (!results.length && !search) {
      return extendedPools;
    } else if (!results) {
      return [];
    }
    return results;
  }, [extendedPools, fuse, search]);

  React.useEffect(() => {
    setSortBy(TradePoolFilterStates.APY_DESC);
  }, [setSortBy]);

  React.useEffect(() => {
    if (!isMobile) return;

    const handleFocus = () => {
      if (searchRef.current) {
        const rect = searchRef.current.getBoundingClientRect();
        window.scrollTo({
          top: window.pageYOffset + rect.top - 80,
          behavior: "smooth",
        });
      }
    };

    const searchInput = searchRef.current?.querySelector("input");
    searchInput?.addEventListener("focus", handleFocus);

    return () => {
      searchInput?.removeEventListener("focus", handleFocus);
    };
  }, [isMobile]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12 min-h-[calc(100vh-100px)]">
        {!initialized && <Loader label="Loading yield farming..." className="mt-8" />}
        {initialized && (
          <>
            <div className="w-full max-w-4xl mx-auto">
              <PageHeading
                heading="Yield farming"
                body={<p>Supply over-collateralized liquidity and earn yield.</p>}
                links={[]}
              />
            </div>

            <div className="flex justify-center items-center w-full max-w-4xl mx-auto mb-8 mt-4 lg:mb-16 lg:mt-8">
              <div className="w-full relative" ref={searchRef}>
                <Input
                  placeholder={isMobile ? "Search tokens..." : "Search tokens by name, symbol, or mint address..."}
                  className="pl-10 py-2 rounded-full h-auto bg-transparent lg:py-2.5 lg:text-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <IconSearch
                  size={isMobile ? 16 : 18}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </div>

            <Desktop>
              {filteredPools && filteredPools.length > 0 && (
                <div
                  className={cn(
                    "text-sm grid xl:text-base gap-4 text-muted-foreground mb-8 items-center",
                    connected ? "grid-cols-7" : "grid-cols-6"
                  )}
                >
                  <div className="pl-4">Pool</div>
                  <div
                    className={cn(
                      "pl-3 flex items-center gap-1 cursor-pointer transition-colors hover:text-foreground",
                      (sortBy === TradePoolFilterStates.LIQUIDITY_ASC ||
                        sortBy === TradePoolFilterStates.LIQUIDITY_DESC) &&
                        "text-foreground"
                    )}
                    onClick={() => {
                      setSortBy(
                        sortBy === TradePoolFilterStates.LIQUIDITY_DESC
                          ? TradePoolFilterStates.LIQUIDITY_ASC
                          : TradePoolFilterStates.LIQUIDITY_DESC
                      );
                    }}
                  >
                    {sortBy === TradePoolFilterStates.LIQUIDITY_ASC && <IconSortAscending size={16} />}
                    {sortBy === TradePoolFilterStates.LIQUIDITY_DESC && <IconSortDescending size={16} />}
                    Total Deposits
                  </div>
                  <button
                    className={cn(
                      "flex items-center gap-1 justify-end cursor-pointer transition-colors xl:justify-center xl:pr-4 hover:text-foreground",
                      (sortBy === TradePoolFilterStates.APY_ASC || sortBy === TradePoolFilterStates.APY_DESC) &&
                        "text-foreground"
                    )}
                    onClick={() => {
                      setSortBy(
                        sortBy === TradePoolFilterStates.APY_DESC
                          ? TradePoolFilterStates.APY_ASC
                          : TradePoolFilterStates.APY_DESC
                      );
                    }}
                  >
                    {sortBy === TradePoolFilterStates.APY_ASC && <IconSortAscending size={16} />}
                    {sortBy === TradePoolFilterStates.APY_DESC && <IconSortDescending size={16} />}
                    Lending APY
                  </button>
                  <div className="text-right xl:text-center">Borrow APY</div>
                  <div className="text-center">Created by</div>
                  {connected && <div>Supplied</div>}
                  <div />
                </div>
              )}
              <div>
                {filteredPools &&
                  filteredPools.length > 0 &&
                  filteredPools.map((pool) => <YieldRow key={pool.groupPk.toBase58()} pool={pool} />)}
              </div>
            </Desktop>
            <Mobile>
              <div className="space-y-12">
                <div className="flex flex-col items-center">
                  <Select
                    value={sortBy}
                    onValueChange={(value) => {
                      setSortBy(value as TradePoolFilterStates);
                    }}
                  >
                    <SelectTrigger className="w-[190px] justify-start gap-2">
                      {dir === "desc" && <IconSortDescending size={16} />}
                      {dir === "asc" && <IconSortAscending size={16} />}
                      <SelectValue placeholder="Sort pools" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option, i) => (
                        <SelectItem key={i} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filteredPools &&
                  filteredPools.length > 0 &&
                  filteredPools.map((pool) => {
                    return <YieldCard key={pool.groupPk.toBase58()} pool={pool} />;
                  })}
              </div>
            </Mobile>

            {filteredPools.length === 0 && search.length > 0 && (
              <div className="w-full flex items-center justify-center">
                <p>No pools found</p>
              </div>
            )}
          </>
        )}
      </div>

      {initialized && previousTxn && (
        <ActionComplete
          isActionComplete={isActionComplete}
          setIsActionComplete={setIsActionComplete}
          previousTxn={previousTxn}
        />
      )}
    </>
  );
}
