import React from "react";

import { IconFilter } from "@tabler/icons-react";

import { cn, LendingModes, PoolTypes } from "@mrgnlabs/mrgn-utils";

import { useUiStore, useUserProfileStore } from "~/store";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

const AssetListNav = () => {
  const { connected } = useWallet();
  const [poolFilter, setPoolFilter, lendingMode, setLendingMode, isFilteredUserPositions, setIsFilteredUserPositions] =
    useUiStore((state) => [
      state.poolFilter,
      state.setPoolFilter,
      state.lendingMode,
      state.setLendingMode,
      state.isFilteredUserPositions,
      state.setIsFilteredUserPositions,
    ]);

  const [denominationUSD, setDenominationUSD] = useUserProfileStore((state) => [
    state.denominationUSD,
    state.setDenominationUSD,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-8 px-2">
        <div className="flex items-center gap-3">
          <Label
            className={cn(
              "text-muted-foreground/60 hover:text-foreground/50 cursor-pointer transition-colors",
              lendingMode === LendingModes.LEND && "text-foreground"
            )}
            onClick={() => {
              setLendingMode(LendingModes.LEND);
            }}
          >
            Lend
          </Label>
          <Switch
            className="data-[state=unchecked]:bg-chartreuse"
            checked={lendingMode === LendingModes.BORROW}
            onCheckedChange={(checked) => {
              setLendingMode(checked ? LendingModes.BORROW : LendingModes.LEND);
            }}
          />
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
        <div
          className={cn("flex shrink-0 items-center gap-2 text-sm ml-auto", !connected && "opacity-50")}
          onClick={(e) => {
            e.stopPropagation();
            if (connected) return;
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
              "transition-colors text-muted-foreground/60 cursor-pointer hover:text-foreground/50",
              denominationUSD && "text-foreground/50"
            )}
          >
            USD Denominated
          </Label>
        </div>
      </div>
      <div className="flex justify-between items-center gap-8 bg-background-gray p-2 rounded-lg">
        <ToggleGroup type="single" value={poolFilter} onValueChange={setPoolFilter}>
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
        {/* <ToggleGroup type="single" value={lendingMode} onValueChange={setLendingMode} className="ml-auto">
        <ToggleGroupItem value="lend" aria-label="Toggle lend">
          Lend
        </ToggleGroupItem>
        <ToggleGroupItem value="borrow" aria-label="Toggle borrow">
          Borrow
        </ToggleGroupItem>
      </ToggleGroup> */}
        <Select>
          <SelectTrigger className="md:w-[180px]">
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
