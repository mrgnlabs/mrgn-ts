import React from "react";

import { useRouter } from "next/router";

import { IconSortAscending, IconSortDescending, IconSparkles, IconGridDots, IconList } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { capture } from "@mrgnlabs/mrgn-utils";

import { useTradeStore, useUiStore } from "~/store";
import { TradePoolFilterStates } from "~/store/tradeStore";
import { POOLS_PER_PAGE } from "~/config/trade";
import { useIsMobile } from "~/hooks/use-is-mobile";

import { PageHeading } from "~/components/common/PageHeading";
import { PoolCard, PoolListItem } from "~/components/common/Pool";
import { PoolSearch } from "~/components/common/Pool";
import { Button } from "~/components/ui/button";
import { Loader } from "~/components/common/Loader";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

const sortOptions: {
  value: TradePoolFilterStates;
  label: string;
  dir?: "asc" | "desc";
}[] = [
  { value: TradePoolFilterStates.TIMESTAMP, label: "Recently created" },
  { value: TradePoolFilterStates.PRICE_MOVEMENT_DESC, label: "24hr price movement" },
  { value: TradePoolFilterStates.LIQUIDITY_DESC, label: "Lending pool liquidity" },
  { value: TradePoolFilterStates.MARKET_CAP_DESC, label: "Market cap desc" },
  { value: TradePoolFilterStates.MARKET_CAP_ASC, label: "Market cap asc", dir: "asc" },
];

enum View {
  GRID = "grid",
  LIST = "list",
}

export default function HomePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [initialized, groupMap, currentPage, totalPages, setCurrentPage, sortBy, setSortBy] = useTradeStore((state) => [
    state.initialized,
    state.groupMap,
    state.currentPage,
    state.totalPages,
    state.setCurrentPage,
    state.sortBy,
    state.setSortBy,
  ]);

  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  const [view, setView] = React.useState<View>(View.GRID);

  const dir = React.useMemo(() => {
    const option = sortOptions.find((option) => option.value === sortBy);
    return option?.dir || "desc";
  }, [sortBy]);

  const groups = React.useMemo(() => {
    return [...groupMap.values()];
  }, [groupMap]);

  const handleFeelingLucky = React.useCallback(() => {
    const randomGroup = groups[Math.floor(Math.random() * groups.length)];
    if (!randomGroup) return;
    capture("feeling_lucky", {
      groupAddress: randomGroup.groupPk.toBase58(),
      tokenAddress: randomGroup.pool.token.info.state.mint.toString(),
      tokenSymbol: randomGroup.pool.token.meta.tokenSymbol,
    });
    router.push(`/trade/${randomGroup.groupPk.toBase58()}`);
  }, [groups, router]);

  React.useEffect(() => {
    setSortBy(TradePoolFilterStates.PRICE_MOVEMENT_DESC);
  }, [setSortBy]);

  return (
    <>
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
                transition={{ duration: 0.5, delay: 1.2 }}
              >
                <PoolSearch showNoResults={false} />

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
                transition={{ duration: 0.5, delay: 1.2 }}
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
                  <SelectContent className="bg-background">
                    {sortOptions.map((option, i) => (
                      <SelectItem key={i} value={option.value} className="focus:bg-accent">
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
                        delayChildren: 1.5,
                      },
                    },
                  }}
                >
                  {groups.length > 0 &&
                    groups.map((group, i) => (
                      <motion.div
                        key={i}
                        variants={{
                          hidden: { opacity: 0 },
                          visible: { opacity: 1 },
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        <PoolCard groupData={group} />
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
                    <div>Market cap</div>
                    <div>Lending pool liquidity</div>
                    <div className="pl-2">Created by</div>
                    <div />
                  </div>
                  <div className="bg-background border rounded-xl px-4 py-1">
                    {groups.length > 0 &&
                      groups.map((group, i) => (
                        <PoolListItem key={i} groupData={group} last={i === groups.length - 1} />
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
    </>
  );
}
