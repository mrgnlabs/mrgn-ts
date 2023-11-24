import React from "react";

import { useUiStore, SORT_OPTIONS_MAP } from "~/store";
import { cn } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { MrgnLabeledSwitch } from "~/components/common/MrgnLabeledSwitch";
import { MrgnContainedSwitch } from "~/components/common/MrgnContainedSwitch";
import { NewAssetBanner } from "~/components/common/AssetList";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

import { LendingModes, PoolTypes, SortType, SortAssetOption } from "~/types";

export const AssetListFilters = () => {
  const { connected } = useWalletContext();
  const [
    lendingMode,
    setLendingMode,
    poolFilter,
    setPoolFilter,
    isFilteredUserPositions,
    setIsFilteredUserPositions,
    setIsWalletAuthDialogOpen,
    sortOption,
    setSortOption,
  ] = useUiStore((state) => [
    state.lendingMode,
    state.setLendingMode,
    state.poolFilter,
    state.setPoolFilter,
    state.isFilteredUserPositions,
    state.setIsFilteredUserPositions,
    state.setIsWalletAuthDialogOpen,
    state.sortOption,
    state.setSortOption,
  ]);

  return (
    <div className="col-span-full w-full space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex w-[150px] h-[42px]">
          <MrgnLabeledSwitch
            labelLeft="Lend"
            labelRight="Borrow"
            checked={lendingMode === LendingModes.BORROW}
            onClick={() => setLendingMode(lendingMode === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND)}
          />
        </div>
        <div className="space-y-2">
          Filter
          <Select
            value={poolFilter}
            onValueChange={(value) => {
              setPoolFilter(value as PoolTypes);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue defaultValue="allpools" placeholder="Select pools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pools</SelectItem>
              <SelectItem value="isolated">Isolated pools</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          Sort
          <Select
            value={sortOption.value}
            onValueChange={(value) => setSortOption(SORT_OPTIONS_MAP[value as SortType])}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Order by" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(SORT_OPTIONS_MAP).map((option) => {
                const opt = option as SortAssetOption;
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {lendingMode === LendingModes.LEND || !opt.borrowLabel ? opt.label : opt.borrowLabel}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className={cn("flex items-center gap-1", !connected && "opacity-50")}
        onClick={(e) => {
          e.stopPropagation();
          if (connected) return;
          setIsWalletAuthDialogOpen(true);
        }}
      >
        <MrgnContainedSwitch
          checked={isFilteredUserPositions}
          onChange={() => setIsFilteredUserPositions(!isFilteredUserPositions)}
          inputProps={{ "aria-label": "controlled" }}
          className={cn(!connected && "pointer-events-none")}
        />
        <div>Filter my positions</div>
      </div>

      <NewAssetBanner asset="jlp" image="https://static.jup.ag/jlp/icon.png" />
    </div>
  );
};
