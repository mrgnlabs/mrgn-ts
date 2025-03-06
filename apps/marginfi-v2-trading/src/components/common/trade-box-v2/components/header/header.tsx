import * as React from "react";

import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { ArenaPoolV2Extended } from "~/types/trade-store.types";
import { SearchPopover } from "~/components/common/search";
import { IconChevronDown } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";

interface HeaderProps {
  activePool: ArenaPoolV2Extended;
  entryPrice: number;
  volume: number | undefined;
}

export const Header = ({ activePool, entryPrice, volume }: HeaderProps) => {
  return (
    <div className="flex items-center justify-between border-b-2 border-border mb-2 py-2 px-4">
      <SearchPopover
        trigger={
          <Button variant="ghost" size="sm" className="text-base h-10 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePool?.tokenBank.meta.tokenLogoUri ?? ""}
              alt={activePool?.tokenBank.meta.tokenSymbol ?? ""}
              width={28}
              height={28}
              className="bg-background border rounded-full lg:mb-0 w-[28px] h-[28px] object-cover"
            />
            <p className="flex items-center gap-1 ">
              {activePool?.tokenBank.meta.tokenSymbol} <IconChevronDown size={18} />
            </p>
          </Button>
        }
      />
      <div className="flex items-center gap-3 pr-2 py-1">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Price</span>
          <span className="text-sm">
            ${dynamicNumeralFormatter(entryPrice, { maxDisplay: 100, ignoreMinDisplay: true })}
          </span>
        </div>
        {volume && (
          <div className="flex flex-col border-l pl-3">
            <span className="text-xs text-muted-foreground">24h vol</span>
            <span className="text-sm">${dynamicNumeralFormatter(volume, { maxDisplay: 10000 })}</span>
          </div>
        )}
      </div>
    </div>
  );
};
