import React from "react";

import Fuse from "fuse.js";
import { IconSortDescending, IconSortAscending, IconSearch } from "@tabler/icons-react";

import { ArenaGroupStatus, Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2 } from "~/store";
import { TradePoolFilterStates } from "~/store/tradeStoreV2";
import { useActionBoxStore } from "~/components/action-box-v2/store";
import { cn } from "@mrgnlabs/mrgn-utils";
import { useIsMobile } from "~/hooks/use-is-mobile";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { PageHeading } from "~/components/common/PageHeading";
import { Loader } from "~/components/common/Loader";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { YieldRow } from "~/components/common/Yield";
import { YieldCard } from "~/components/common/Yield/YieldCard";
import { useExtendedPools } from "~/hooks/useExtendedPools";
import { GetStaticProps } from "next";
import { StaticArenaProps, getArenaStaticProps } from "~/utils";
import { GeoBlockingWrapper } from "~/components/common/geo-blocking-wrapper";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";

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

export const getStaticProps: GetStaticProps<StaticArenaProps> = async (context) => {
  return getArenaStaticProps(context);
};

export default function YieldPage({ initialData }: StaticArenaProps) {
  const [poolsFetched, sortBy, setSortBy, fetchArenaGroups, setHydrationComplete] = useTradeStoreV2((state) => [
    state.poolsFetched,
    state.sortBy,
    state.setSortBy,
    state.fetchArenaGroups,
    state.setHydrationComplete,
  ]);
  const [showActivePositions, setShowActivePositions] = React.useState(false);

  const extendedPools = useExtendedPools();

  const availablePools = React.useMemo(() => {
    const pools = extendedPools.filter(
      (pool) => pool.status === ArenaGroupStatus.EMPTY || pool.status === ArenaGroupStatus.LP
    );
    if (showActivePositions) {
      return pools.filter((pool) => pool.status === ArenaGroupStatus.LP);
    }
    return pools;
  }, [extendedPools, showActivePositions]);

  const fuse = React.useMemo(() => {
    return new Fuse(availablePools, {
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
  }, [availablePools]);

  const isMobile = useIsMobile();
  const { connected } = useWallet();
  const [search, setSearch] = React.useState("");

  const searchRef = React.useRef<HTMLDivElement>(null);

  const dir = React.useMemo(() => {
    const option = sortOptions.find((option) => option.value === sortBy);
    return option?.dir || "desc";
  }, [sortBy]);

  const filteredPools = React.useMemo(() => {
    if (!fuse) return availablePools;
    const results = fuse.search(search).map((result) => result.item);
    if (!results.length && !search) {
      return availablePools;
    } else if (!results) {
      return [];
    }
    return results;
  }, [availablePools, fuse, search]);

  React.useEffect(() => {
    if (initialData) {
      fetchArenaGroups(initialData);
      setHydrationComplete();
    }
  }, [initialData, fetchArenaGroups, setHydrationComplete]);

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
      {/* <Meta /> */}
      <GeoBlockingWrapper>
        <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12 min-h-[calc(100vh-100px)]">
          {!poolsFetched && <Loader label="Loading yield farming..." className="mt-8" />}
          {poolsFetched && (
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
                    <div className="text-center">Pool owner</div>
                    <div
                      className={cn(
                        "flex items-center gap-1 cursor-pointer transition-colors hover:text-foreground",
                        (sortBy === TradePoolFilterStates.DEPOSITS_ASC ||
                          sortBy === TradePoolFilterStates.DEPOSITS_DESC) &&
                          "text-foreground"
                      )}
                      onClick={() => {
                        setSortBy(
                          sortBy === TradePoolFilterStates.DEPOSITS_DESC
                            ? TradePoolFilterStates.DEPOSITS_ASC
                            : TradePoolFilterStates.DEPOSITS_DESC
                        );
                      }}
                    >
                      {sortBy === TradePoolFilterStates.DEPOSITS_ASC && <IconSortAscending size={16} />}
                      {sortBy === TradePoolFilterStates.DEPOSITS_DESC && <IconSortDescending size={16} />}
                      Total Deposits
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 cursor-pointer transition-colors hover:text-foreground",
                        (sortBy === TradePoolFilterStates.BORROWS_ASC ||
                          sortBy === TradePoolFilterStates.BORROWS_DESC) &&
                          "text-foreground"
                      )}
                      onClick={() => {
                        setSortBy(
                          sortBy === TradePoolFilterStates.BORROWS_DESC
                            ? TradePoolFilterStates.BORROWS_ASC
                            : TradePoolFilterStates.BORROWS_DESC
                        );
                      }}
                    >
                      {sortBy === TradePoolFilterStates.BORROWS_ASC && <IconSortAscending size={16} />}
                      {sortBy === TradePoolFilterStates.BORROWS_DESC && <IconSortDescending size={16} />}
                      Total Borrows
                    </div>
                    <button
                      className={cn(
                        "flex items-center gap-1 cursor-pointer transition-colors hover:text-foreground",
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

                    {connected ? (
                      <div className="flex items-center justify-end gap-2 w-full col-span-2">
                        <Label htmlFor="show-active-positions" className="text-muted-foreground text-xs">
                          Show active positions
                        </Label>
                        <Switch
                          id="show-active-positions"
                          checked={showActivePositions}
                          onCheckedChange={setShowActivePositions}
                        />
                      </div>
                    ) : (
                      <div />
                    )}
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
                  <div className="flex items-center justify-between">
                    <Select
                      value={sortBy}
                      onValueChange={(value) => {
                        setSortBy(value as TradePoolFilterStates);
                      }}
                    >
                      <SelectTrigger className="w-[210px] justify-start gap-2 bg-background border border-border h-8">
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
                    <div className={cn("hidden items-center justify-end gap-2 w-full", connected && "flex")}>
                      <Label htmlFor="show-active-positions" className="text-muted-foreground text-xs">
                        Show active positions
                      </Label>
                      <Switch
                        id="show-active-positions"
                        checked={showActivePositions}
                        onCheckedChange={setShowActivePositions}
                      />
                    </div>
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
      </GeoBlockingWrapper>
    </>
  );
}
