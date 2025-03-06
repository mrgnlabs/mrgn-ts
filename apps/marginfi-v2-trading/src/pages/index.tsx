import React from "react";

import { useRouter } from "next/router";
import { GetStaticProps } from "next";

import { IconSortAscending, IconSortDescending, IconSparkles, IconGridDots, IconList } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { capture } from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2 } from "~/store";
import { TradePoolFilterStates } from "~/store/tradeStoreV2";
import { useIsMobile } from "~/hooks/use-is-mobile";

import { PageHeading } from "~/components/common/PageHeading";
import { PoolCard, PoolListItem } from "~/components/common/Pool";
import { PoolSearch } from "~/components/common/Pool";
import { Button } from "~/components/ui/button";
import { Loader } from "~/components/common/Loader";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { getArenaStaticProps, StaticArenaProps } from "~/utils/trade-store.utils";
import { GeoBlockingWrapper } from "~/components/common/geo-blocking-wrapper";
import { SearchInput } from "~/components/common/search";

const sortOptions: {
  value: TradePoolFilterStates;
  label: string;
  dir?: "asc" | "desc";
}[] = [
  { value: TradePoolFilterStates.TIMESTAMP, label: "Recently created" },
  { value: TradePoolFilterStates.PRICE_MOVEMENT_DESC, label: "24hr price movement" },
  { value: TradePoolFilterStates.LIQUIDITY_DESC, label: "Pool liquidity" },
];

enum View {
  GRID = "grid",
  LIST = "list",
}

export const getStaticProps: GetStaticProps<StaticArenaProps> = async (context) => {
  return getArenaStaticProps(context);
};

export default function HomePage({ initialData }: StaticArenaProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [initialized, arenaPoolsSummary, sortBy, setSortBy, fetchArenaGroups, setHydrationComplete] = useTradeStoreV2(
    (state) => [
      state.initialized,
      state.arenaPoolsSummary,
      state.sortBy,
      state.setSortBy,
      state.fetchArenaGroups,
      state.setHydrationComplete,
    ]
  );

  React.useEffect(() => {
    if (initialData) {
      fetchArenaGroups(initialData);
      setHydrationComplete();
    }
  }, [initialData, fetchArenaGroups, setHydrationComplete]);

  const [view, setView] = React.useState<View>(View.GRID);

  const dir = React.useMemo(() => {
    const option = sortOptions.find((option) => option.value === sortBy);
    return option?.dir || "desc";
  }, [sortBy]);

  const arenaPools = React.useMemo(() => {
    return [...Object.values(arenaPoolsSummary)];
  }, [arenaPoolsSummary]);

  const handleFeelingLucky = React.useCallback(() => {
    const randomGroup = arenaPools[Math.floor(Math.random() * arenaPools.length)];
    if (!randomGroup) return;
    capture("feeling_lucky", {
      groupAddress: randomGroup.groupPk.toBase58(),
      tokenAddress: randomGroup.tokenSummary.mint.toString(),
      tokenSymbol: randomGroup.tokenSummary.tokenSymbol,
    });
    router.push(`/trade/${randomGroup.groupPk.toBase58()}`);
  }, [arenaPools, router]);

  React.useEffect(() => {
    setSortBy(TradePoolFilterStates.PRICE_MOVEMENT_DESC);
  }, [setSortBy]);

  return (
    <>
      {/* <Meta /> */}
      <GeoBlockingWrapper>
        <div className="w-full max-w-8xl mx-auto px-4 pb-16 pt-8 md:pt-14 min-h-[calc(100vh-100px)]">
          {!initialized && <Loader label="Loading the arena..." className="mt-8" />}
          {initialized && (
            <>
              <div className="w-full max-w-4xl mx-auto">
                <PageHeading
                  size="lg"
                  heading={<div className="flex flex-col gap-2 md:inline">Welcome to the arena</div>}
                  body={<p>Memecoin trading, with leverage.</p>}
                  animate={true}
                />
                <motion.div
                  data-search
                  className="search flex flex-col items-center gap-4 md:gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <SearchInput />
                  {/* <PoolSearch showNoResults={false} /> */}

                  <Button
                    variant="outline"
                    onClick={handleFeelingLucky}
                    size={isMobile ? "sm" : "default"}
                    className="bg-transparent"
                  >
                    <IconSparkles size={isMobile ? 16 : 18} /> I&apos;m feeling lucky
                  </Button>
                </motion.div>
              </div>

              <div className="w-full space-y-6 py-12 md:pt-16">
                <motion.div
                  data-filter
                  className="flex items-center justify-between"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.75 }}
                >
                  <ToggleGroup
                    type="single"
                    value={view}
                    onValueChange={(value) => {
                      if (!value) return;
                      setView(value as View);
                    }}
                    className="hidden gap-2 self-baseline lg:flex"
                  >
                    <ToggleGroupItem value={View.GRID} aria-label="Grid View" className="border gap-1.5">
                      <IconGridDots size={16} /> Grid
                    </ToggleGroupItem>
                    <ToggleGroupItem value={View.LIST} aria-label="List View" className="border gap-1.5">
                      <IconList size={16} /> List
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => {
                      setSortBy(value as TradePoolFilterStates);
                    }}
                  >
                    <SelectTrigger className="w-[210px] justify-start gap-2 bg-background border border-border">
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
                </motion.div>
                {view === View.GRID && (
                  <motion.div
                    className="grid md:grid-cols-2 xl:grid-cols-3 gap-8"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.15,
                          delayChildren: 1,
                        },
                      },
                    }}
                  >
                    {arenaPools.length > 0 &&
                      arenaPools.map((pool, i) => (
                        <motion.div
                          key={i}
                          variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1 },
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          <PoolCard poolData={pool} />
                        </motion.div>
                      ))}
                  </motion.div>
                )}
                {view === View.LIST && (
                  <div className="w-full space-y-2">
                    <div className="grid grid-cols-7 w-full text-muted-foreground">
                      <div className="pl-5">Asset</div>
                      <div className="pl-2.5">Price</div>
                      <div className="pl-2">24hr Volume</div>
                      <div>Funding rate</div>
                      <div>Pool liquidity</div>
                      <div className="pl-2">Created by</div>
                      <div />
                    </div>
                    <div className="bg-background border rounded-xl px-4 py-1">
                      {arenaPools.length > 0 &&
                        arenaPools.map((pool, i) => (
                          <PoolListItem key={i} poolData={pool} last={i === arenaPools.length - 1} />
                        ))}
                    </div>
                  </div>
                )}
                {/* {currentPage < totalPages && (
                <div className="py-8 flex justify-center">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      if (currentPage >= totalPages) return;
                      setCurrentPage(currentPage + 1);
                    }}
                  >
                    Load more pools
                  </Button>
                </div>
              )} */}
              </div>
            </>
          )}
        </div>
      </GeoBlockingWrapper>
    </>
  );
}
