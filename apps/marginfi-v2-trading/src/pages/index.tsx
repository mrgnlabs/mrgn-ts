import React from "react";

import { useRouter } from "next/router";

import { IconSortAscending, IconSortDescending, IconSparkles, IconGridDots, IconList } from "@tabler/icons-react";
import { motion, useAnimate, stagger } from "framer-motion";

import { useTradeStore, useUiStore } from "~/store";
import { TradePoolFilterStates } from "~/store/tradeStore";
import { POOLS_PER_PAGE } from "~/config/trade";
import { useIsMobile } from "~/hooks/useIsMobile";

import { PageHeading } from "~/components/common/PageHeading";
import { PoolCard } from "~/components/common/Pool/PoolCard";
import { ActionComplete } from "~/components/common/ActionComplete";
import { PoolSearch } from "~/components/common/Pool";
import { Button } from "~/components/ui/button";
import { Loader } from "~/components/ui/loader";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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
                <ToggleGroup type="single" defaultValue="grid" className="gap-2 self-baseline">
                  <ToggleGroupItem value="grid" aria-label="Grid View" className="border gap-1.5">
                    <IconGridDots size={16} /> Grid
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="List View" className="border gap-1.5">
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
              <motion.div data-grid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {banks.length > 0 &&
                  banks.slice(0, currentPage * POOLS_PER_PAGE).map((bank, i) => (
                    <motion.div data-item key={i} initial={{ opacity: 0 }}>
                      <PoolCard bank={bank} />
                    </motion.div>
                  ))}
              </motion.div>
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
