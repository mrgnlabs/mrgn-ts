import React from "react";

import { IconSortAscending, IconSortDescending } from "@tabler/icons-react";

import { useTradeStore, useUiStore } from "~/store";
import { TradePoolFilterStates } from "~/store/tradeStore";
import { POOLS_PER_PAGE } from "~/config/trade";

import { PageHeading } from "~/components/common/PageHeading";
import { PoolCard } from "~/components/common/Pool/PoolCard";
import { ActionComplete } from "~/components/common/ActionComplete";
import { PoolSearch } from "~/components/common/Pool";
import { Button } from "~/components/ui/button";
import { Loader } from "~/components/ui/loader";
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
  const [
    initialized,
    banks,
    filteredBanks,
    resetActiveGroup,
    currentPage,
    totalPages,
    setCurrentPage,
    sortBy,
    setSortBy,
  ] = useTradeStore((state) => [
    state.initialized,
    state.banks,
    state.filteredBanks,
    state.resetActiveGroup,
    state.currentPage,
    state.totalPages,
    state.setCurrentPage,
    state.sortBy,
    state.setSortBy,
  ]);

  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  const dir = React.useMemo(() => {
    const option = sortOptions.find((option) => option.value === sortBy);
    return option?.dir || "desc";
  }, [sortBy]);

  React.useEffect(() => {
    resetActiveGroup();
  }, [resetActiveGroup]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
        {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
        {initialized && (
          <>
            <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
              <PageHeading
                size="lg"
                heading={
                  <>
                    the arena <span className="text-lg">by mrgn</span>
                  </>
                }
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

            <div className="w-full space-y-6 px-4 lg:px-8 pt-16 pb-12">
              <div className="flex items-center justify-end">
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
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {banks.length > 0 &&
                  banks.slice(0, currentPage * POOLS_PER_PAGE).map((bank, i) => <PoolCard key={i} bank={bank} />)}
              </div>
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
