import React from "react";

import { IconFilter, IconSearch, IconX } from "@tabler/icons-react";

import { cn, LendingModes, PoolTypes } from "@mrgnlabs/mrgn-utils";

import { useUiStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Input } from "~/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

const AssetListNav = () => {
  const [poolFilter, setPoolFilter, lendingMode, setLendingMode, assetListSearch, setAssetListSearch] = useUiStore(
    (state) => [
      state.poolFilter,
      state.setPoolFilter,
      state.lendingMode,
      state.setLendingMode,
      state.assetListSearch,
      state.setAssetListSearch,
    ]
  );

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
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center gap-8 px-2">
        <div className="flex items-center gap-3">
          <Label
            className={cn(
              "text-muted-foreground/60 hover:text-foreground/50 cursor-pointer transition-colors",
              lendingMode === LendingModes.LEND && "text-foreground hover:text-foreground"
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
              "text-muted-foreground/60 hover:text-foreground/50 cursor-pointer transition-colors",
              lendingMode === LendingModes.BORROW && "text-foreground"
            )}
            onClick={() => {
              setLendingMode(LendingModes.BORROW);
            }}
          >
            Borrow
          </Label>
        </div>
      </div>
      <div className="flex justify-between items-center gap-8 bg-background-gray p-2 rounded-lg">
        <ToggleGroup type="single" value={poolFilter} onValueChange={setPoolFilter} className="shrink-0">
          <ToggleGroupItem value="global" aria-label="Toggle global">
            Global
          </ToggleGroupItem>
          <ToggleGroupItem value="isolated" aria-label="Toggle isolated">
            Isolated
          </ToggleGroupItem>
          <ToggleGroupItem value="native_stake" aria-label="Toggle staked" className="relative">
            ✨ Native Stake
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="relative w-full text-muted-foreground max-w-[320px] ml-auto">
          <IconSearch size={15} className="absolute top-2.5 left-4" />
          <Input
            placeholder="Search assets"
            className="py-1.5 h-auto px-10 w-full rounded-full border-background-gray-hover transition-colors focus:text-primary/70 focus-visible:ring-primary/50"
            value={assetListSearch}
            onChange={(e) => {
              setAssetListSearch(e.target.value);
            }}
          />
          <IconX
            size={15}
            className={cn(
              "absolute top-2.5 right-3 cursor-pointer opacity-0 transition-opacity hover:opacity-100",
              assetListSearch.length && "opacity-50"
            )}
            onClick={() => setAssetListSearch("")}
          />
        </div>
        <Select>
          <SelectTrigger className="md:w-[180px] shrink-0">
            <div className="flex items-center gap-2">
              <IconFilter size={18} />
              <SelectValue defaultValue="all" placeholder="All tokens" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tokens</SelectItem>
            <SelectItem value="stable">Stablecoins</SelectItem>
            <SelectItem value="lst">SOL / LST</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export { AssetListNav };
