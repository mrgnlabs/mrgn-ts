import React from "react";

import { useUiStore, useUserProfileStore, SORT_OPTIONS_MAP } from "~/store";
import { cn } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { IconFilter, IconSortAscending, IconSortDescending } from "~/components/ui/icons";

import { LendingModes, PoolTypes, SortType, sortDirection, SortAssetOption } from "~/types";

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

  const [denominationUSD, setDenominationUSD] = useUserProfileStore((state) => [
    state.denominationUSD,
    state.setDenominationUSD,
  ]);

  return (
    <div className="col-span-full w-full space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-8 pr-1">
        <div className="mr-auto">
          <ToggleGroup
            type="single"
            variant={"actionBox"}
            value={lendingMode}
            onValueChange={() =>
              setLendingMode(lendingMode === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND)
            }
            className="bg-background-gray/70 rounded-lg"
          >
            <ToggleGroupItem value="lend" aria-label="Lend">
              Lend
            </ToggleGroupItem>
            <ToggleGroupItem value="borrow" aria-label="Borrow">
              Borrow
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div
          className={cn("flex items-center gap-2 text-sm", !connected && "opacity-50")}
          onClick={(e) => {
            e.stopPropagation();
            if (connected) return;
            setIsWalletAuthDialogOpen(true);
          }}
        >
          <Switch
            id="usd-denominated"
            checked={denominationUSD}
            onCheckedChange={() => {
              if (!connected) return;
              setDenominationUSD(!denominationUSD);
            }}
          />
          <Label
            htmlFor="usd-denominated"
            className={cn(
              "transition-colors text-muted-foreground cursor-pointer hover:text-white",
              isFilteredUserPositions && "text-white"
            )}
          >
            USD Denominated
          </Label>
        </div>
        <div
          className={cn("flex items-center gap-2 text-sm", !connected && "opacity-50")}
          onClick={(e) => {
            e.stopPropagation();
            if (connected) return;
            setIsWalletAuthDialogOpen(true);
          }}
        >
          <Switch
            id="filter-positions"
            checked={isFilteredUserPositions}
            onCheckedChange={() => {
              if (!connected) return;
              setIsFilteredUserPositions(!isFilteredUserPositions);
              setPoolFilter(PoolTypes.ALL);
            }}
          />
          <Label
            htmlFor="filter-positions"
            className={cn(
              "transition-colors text-muted-foreground cursor-pointer hover:text-white",
              isFilteredUserPositions && "text-white"
            )}
          >
            Filter my positions
          </Label>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="space-y-2 w-full md:w-auto">
            <Select
              value={poolFilter}
              disabled={isFilteredUserPositions}
              onValueChange={(value) => {
                setPoolFilter(value as PoolTypes);
              }}
            >
              <SelectTrigger className="md:w-[180px]">
                <div className="flex items-center gap-2">
                  <IconFilter size={18} />
                  <SelectValue defaultValue="allpools" placeholder="Select pools" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All pools</SelectItem>
                <SelectItem value="isolated">Isolated pools</SelectItem>
                <SelectItem value="stable">Stablecoins</SelectItem>
                <SelectItem value="lst">SOL / LST</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* <div className="space-y-2 w-full md:w-auto">
            <Select
              value={sortOption.value}
              disabled={isFilteredUserPositions}
              onValueChange={(value) => setSortOption(SORT_OPTIONS_MAP[value as SortType])}
            >
              <SelectTrigger className="md:w-[220px]">
                <div className="flex items-center gap-2">
                  {sortOption.direction === sortDirection.ASC ? (
                    <IconSortAscending size={18} />
                  ) : (
                    <IconSortDescending size={18} />
                  )}
                  <SelectValue placeholder="Order by" />
                </div>
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
          </div> */}
        </div>
      </div>
    </div>
  );
};
