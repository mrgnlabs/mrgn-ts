import React from "react";

import { useRouter } from "next/router";

import { IconSortAscending, IconSortDescending, IconSparkles, IconGridDots, IconList } from "@tabler/icons-react";
import { motion, useAnimate, stagger } from "framer-motion";

import { useTradeStore, useUiStore } from "~/store";
import { TradePoolFilterStates } from "~/store/tradeStore";
import { POOLS_PER_PAGE } from "~/config/trade";
import { useIsMobile } from "~/hooks/useIsMobile";

import { PageHeading } from "~/components/common/PageHeading";
import { PoolCard, PoolListItem } from "~/components/common/Pool";
import { ActionComplete } from "~/components/common/ActionComplete";
import { PoolSearch } from "~/components/common/Pool";
import { Button } from "~/components/ui/button";
import { Loader } from "~/components/ui/loader";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

const sortOptions: {
  value: TradePoolFilterStates;
  label: string;
  dir?: "asc" | "desc";
}[] = [
  { value: TradePoolFilterStates.TIMESTAMP, label: "Recently created" },
  { value: TradePoolFilterStates.PRICE_ASC, label: "Price Asc", dir: "asc" },
  { value: TradePoolFilterStates.PRICE_DESC, label: "Price Desc" },
  { value: TradePoolFilterStates.LONG, label: "Open long" },
  { value: TradePoolFilterStates.SHORT, label: "Open short" },
];

enum View {
  GRID = "grid",
  LIST = "list",
}

export default function HomePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [initialized, banks, resetActiveGroup, currentPage, totalPages, setCurrentPage, sortBy, setSortBy] =
    useTradeStore((state) => [
      state.initialized,
      state.banks,
      state.resetActiveGroup,
      state.currentPage,
      state.totalPages,
      state.setCurrentPage,
      state.sortBy,
      state.setSortBy,
    ]);

  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  const [scope, animate] = useAnimate();

  const [view, setView] = React.useState<View>(View.GRID);
  const [initialAnimation, setInitialAnimation] = React.useState(false);

  const dir = React.useMemo(() => {
    const option = sortOptions.find((option) => option.value === sortBy);
    return option?.dir || "desc";
  }, [sortBy]);

  const handleFeelingLucky = () => {
    const randomPool = banks[Math.floor(Math.random() * banks.length)];
    if (!randomPool) return;
    router.push(`/trade/${randomPool.address.toBase58()}`);
  };

  React.useEffect(() => {
    resetActiveGroup();
  }, [resetActiveGroup]);

  React.useEffect(() => {
    if (!initialized) return;
    const timeout = setTimeout(() => {
      requestAnimationFrame(() => animate("[data-item]", { opacity: 1 }, { duration: 0.5, delay: stagger(0.25) }));
      setInitialAnimation(true);
    }, 1500);
    animate("[data-filter]", { opacity: 1 }, { duration: 0.3, delay: 1.25 });

    return () => clearTimeout(timeout);
  }, [initialized, animate, scope]);

  return (
    <>
      <div ref={scope} className="w-full max-w-8xl mx-auto px-4 pb-16 pt-8 md:pt-14">
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

                <Button variant="outline" onClick={handleFeelingLucky} size={isMobile ? "sm" : "default"}>
                  <IconSparkles size={isMobile ? 16 : 18} /> I&apos;m feeling lucky
                </Button>
              </motion.div>
            </div>

            <div className="w-full space-y-6 py-12 md:pt-16">
              <motion.div data-filter className="flex items-center justify-between" initial={{ opacity: 0 }}>
                <ToggleGroup
                  type="single"
                  value={view}
                  onValueChange={(value) => {
                    if (!value) return;
                    setView(value as View);
                  }}
                  className="gap-2 self-baseline"
                >
                  <ToggleGroupItem value={View.GRID} aria-label="Grid View" className="border gap-1.5">
                    <IconGridDots size={16} /> Grid
                  </ToggleGroupItem>
                  <ToggleGroupItem value={View.LIST} aria-label="List View" className="border gap-1.5">
                    <IconList size={16} /> List
                  </ToggleGroupItem>
                </ToggleGroup>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as TradePoolFilterStates)}>
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
              </motion.div>
              {view === View.GRID && (
                <motion.div data-grid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {banks.length > 0 &&
                    banks.slice(0, currentPage * POOLS_PER_PAGE).map((bank, i) => (
                      <motion.div data-item key={i} initial={{ opacity: !initialAnimation ? 0 : 1 }}>
                        <PoolCard bank={bank} />
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
                    <div>Total liquidity</div>
                    <div className="pl-2">Created by</div>
                    <div />
                  </div>
                  <div className="bg-background border rounded-xl px-4 py-1">
                    {banks.length > 0 &&
                      banks
                        .slice(0, currentPage * POOLS_PER_PAGE)
                        .map((bank, i) => <PoolListItem key={i} bank={bank} last={i === banks.length - 1} />)}
                  </div>
                </div>
              )}
              {currentPage < totalPages && (
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
              )}
            </div>
          </>
        )}
      </div>

      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}
