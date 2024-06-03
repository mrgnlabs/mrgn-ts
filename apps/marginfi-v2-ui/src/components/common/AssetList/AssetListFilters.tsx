import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { useUiStore, useUserProfileStore } from "~/store";
import { cn } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useActionBoxStore } from "~/hooks/useActionBoxStore";
import { LendingModes, PoolTypes } from "~/types";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { IconFilter, IconSearch, IconX } from "~/components/ui/icons";
import { Input } from "~/components/ui/input";

export const AssetListFilters = () => {
  const { connected } = useWalletContext();
  const [
    poolFilter,
    setPoolFilter,
    isFilteredUserPositions,
    setIsFilteredUserPositions,
    setIsWalletAuthDialogOpen,
    assetListSearch,
    setAssetListSearch,
  ] = useUiStore((state) => [
    state.poolFilter,
    state.setPoolFilter,
    state.isFilteredUserPositions,
    state.setIsFilteredUserPositions,
    state.setIsWalletAuthDialogOpen,
    state.assetListSearch,
    state.setAssetListSearch,
  ]);

  const [actionMode, setActionMode] = useActionBoxStore()((state) => [state.actionMode, state.setActionMode]);

  const [denominationUSD, setDenominationUSD] = useUserProfileStore((state) => [
    state.denominationUSD,
    state.setDenominationUSD,
  ]);

  const lendingMode = React.useMemo(
    () => (actionMode === ActionType.Deposit ? LendingModes.LEND : LendingModes.BORROW),
    [actionMode]
  );

  const searchRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="col-span-full w-full space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-8 pr-1">
        <div className="mr-auto">
          <ToggleGroup
            type="single"
            variant={"actionBox"}
            value={lendingMode}
            onValueChange={() =>
              setActionMode(lendingMode === LendingModes.LEND ? ActionType.Borrow : ActionType.Deposit)
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
        <div className="relative w-full text-muted-foreground">
          <IconSearch size={18} className="absolute top-3 left-3.5" />
          <Input
            ref={searchRef}
            placeholder="Search assets"
            className="py-5 px-10 w-full rounded-full border-background-gray-hover transition-colors focus:text-primary/70"
            value={assetListSearch}
            onChange={(e) => {
              setAssetListSearch(e.target.value);
            }}
          />
          <IconX
            size={18}
            className={cn(
              "absolute top-3 right-3.5 cursor-pointer opacity-0 transition-opacity",
              assetListSearch.length && "opacity-100"
            )}
            onClick={() => setAssetListSearch("")}
          />
        </div>
        <div
          className={cn("flex shrink-0 items-center gap-2 text-sm", !connected && "opacity-50")}
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
          className={cn("flex shrink-0 items-center gap-2 text-sm", !connected && "opacity-50")}
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
        </div>
      </div>
    </div>
  );
};
