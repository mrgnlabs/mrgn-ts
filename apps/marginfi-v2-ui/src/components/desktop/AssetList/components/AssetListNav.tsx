import React from "react";

import { IconFilter, IconSearch, IconX } from "@tabler/icons-react";

import { cn, LendingModes, PoolTypes } from "@mrgnlabs/mrgn-utils";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useUiStore, useMrgnlendStore } from "~/store";
import { TokenFilters } from "~/store/uiStore";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Input } from "~/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";
import { IconEmode } from "~/components/ui/icons";

const AssetListNav = () => {
  const [
    poolFilter,
    setPoolFilter,
    lendingMode,
    setLendingMode,
    assetListSearch,
    setAssetListSearch,
    tokenFilter,
    setTokenFilter,
  ] = useUiStore((state) => [
    state.poolFilter,
    state.setPoolFilter,
    state.lendingMode,
    state.setLendingMode,
    state.assetListSearch,
    state.setAssetListSearch,
    state.tokenFilter,
    state.setTokenFilter,
  ]);
  const [userActiveEmodes, emodePairs] = useMrgnlendStore((state) => [state.userActiveEmodes, state.emodePairs]);
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(assetListSearch.length > 0);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const switchComponent = (
    <Switch
      className="data-[state=unchecked]:bg-chartreuse"
      checked={lendingMode === LendingModes.BORROW}
      onCheckedChange={(checked) => {
        setLendingMode(checked ? LendingModes.BORROW : LendingModes.LEND);
      }}
      disabled={poolFilter === PoolTypes.NATIVE_STAKE}
    />
  );

  return (
    <div className="relative">
      <div className="flex justify-between items-center rounded-lg">
        <ToggleGroup
          type="single"
          value={poolFilter}
          onValueChange={(value) => {
            if (!value) return;
            setPoolFilter(value as PoolTypes);
          }}
          className="shrink-0 bg-background-gray p-1.5 rounded-lg"
        >
          <ToggleGroupItem value="global" aria-label="Toggle global">
            Global
          </ToggleGroupItem>
          <ToggleGroupItem value="isolated" aria-label="Toggle isolated">
            Isolated
          </ToggleGroupItem>
          <ToggleGroupItem value="native_stake" aria-label="Toggle staked" className="relative">
            Native Stake
          </ToggleGroupItem>
          {emodePairs.length > 0 && (
            <ToggleGroupItem value="e_mode" aria-label="Toggle e-mode" className="relative gap-1 items-center pl-1.5">
              <IconEmode size={24} className="text-mfi-emode" />
              <span className="ml-0.5">e-mode</span>
              <span
                className={cn(
                  "bg-gray-400 rounded-full h-2 w-2 ml-2",
                  userActiveEmodes.length > 0 && "bg-mrgn-success"
                )}
              />
            </ToggleGroupItem>
          )}
        </ToggleGroup>
        <div className="flex items-center gap-3 ml-10">
          <Label
            className={cn(
              "text-muted-foreground hover:text-foreground cursor-pointer transition-colors",
              lendingMode === LendingModes.LEND && "text-foreground"
            )}
            onClick={() => {
              setLendingMode(LendingModes.LEND);
            }}
          >
            Lend
          </Label>
          {poolFilter === PoolTypes.NATIVE_STAKE ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild className="translate-y-[2px]">
                  <div>{switchComponent}</div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Native stake is not available in borrow mode.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            switchComponent
          )}
          <Label
            className={cn(
              "text-muted-foreground",
              lendingMode === LendingModes.BORROW && "text-foreground",
              poolFilter === PoolTypes.NATIVE_STAKE
                ? "cursor-not-allowed"
                : "hover:text-foreground cursor-pointer transition-colors"
            )}
            onClick={() => {
              poolFilter !== PoolTypes.NATIVE_STAKE && setLendingMode(LendingModes.BORROW);
            }}
          >
            Borrow
          </Label>
        </div>
        <div className={cn("relative text-muted-foreground ml-auto mr-4", isSearchExpanded && "w-full ml-16")}>
          <Button
            variant="ghost"
            size="icon"
            className={cn("flex rounded-md", isSearchExpanded && "hidden")}
            onClick={() => {
              setIsSearchExpanded(!isSearchExpanded);
              setTimeout(() => {
                searchInputRef.current?.focus();
              }, 100);
            }}
          >
            <IconSearch size={15} />
          </Button>
          <div className={cn("hidden", isSearchExpanded && "block")}>
            <IconSearch size={15} className="absolute top-[11px] left-4" />
            <Input
              placeholder="Search assets"
              className="py-1 h-9 px-10 w-full rounded-lg border-border bg-background transition-colors focus:text-primary/70"
              value={assetListSearch}
              ref={searchInputRef}
              onChange={(e) => {
                setAssetListSearch(e.target.value);
              }}
              onBlur={() => {
                if (assetListSearch.length === 0) {
                  setIsSearchExpanded(false);
                }
              }}
            />
            <IconX
              size={15}
              className="absolute top-[11px] right-3 cursor-pointer"
              onClick={() => {
                setAssetListSearch("");
                setIsSearchExpanded(false);
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={tokenFilter} onValueChange={setTokenFilter} disabled={poolFilter === PoolTypes.NATIVE_STAKE}>
            <SelectTrigger className="md:w-[180px] shrink-0">
              <div className="flex items-center gap-2">
                <IconFilter size={18} />
                <SelectValue defaultValue="all" placeholder="All tokens" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TokenFilters.ALL}>All tokens</SelectItem>
              <SelectItem value={TokenFilters.STABLE}>Stablecoins</SelectItem>
              <SelectItem value={TokenFilters.LST}>SOL / LST</SelectItem>
              <SelectItem value={TokenFilters.MEME}>Memes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export { AssetListNav };
