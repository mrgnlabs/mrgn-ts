import React from "react";

import { IconFilter } from "@tabler/icons-react";

import { PoolTypes } from "@mrgnlabs/mrgn-utils";

import { useUiStore } from "~/store";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

const AssetListNav = () => {
  const [poolFilter, setPoolFilter, lendingMode, setLendingMode] = useUiStore((state) => [
    state.poolFilter,
    state.setPoolFilter,
    state.lendingMode,
    state.setLendingMode,
  ]);

  return (
    <div className="flex justify-between items-center gap-4 bg-background-gray p-2 rounded-lg">
      <ToggleGroup type="single" value={poolFilter} onValueChange={setPoolFilter}>
        <ToggleGroupItem value="global" aria-label="Toggle global">
          Global
        </ToggleGroupItem>
        <ToggleGroupItem value="isolated" aria-label="Toggle isolated">
          Isolated
        </ToggleGroupItem>
        <ToggleGroupItem value="native_stake" aria-label="Toggle staked">
          Staked Assets
        </ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" value={lendingMode} onValueChange={setLendingMode} className="ml-auto">
        <ToggleGroupItem value="lend" aria-label="Toggle lend">
          Lend
        </ToggleGroupItem>
        <ToggleGroupItem value="borrow" aria-label="Toggle borrow">
          Borrow
        </ToggleGroupItem>
      </ToggleGroup>
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
  );
};

export { AssetListNav };
