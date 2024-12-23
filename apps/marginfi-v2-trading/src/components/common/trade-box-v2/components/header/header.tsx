import { useRouter } from "next/router";
import * as React from "react";

import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { TokenCombobox } from "~/components/common/TokenCombobox";
import { ArenaPoolV2Extended } from "~/types/trade-store.types";

interface HeaderProps {
  activePool: ArenaPoolV2Extended;
  entryPrice: number;
  volume: number | undefined;
}

export const Header = ({ activePool, entryPrice, volume }: HeaderProps) => {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between border-b-2 border-border mb-2 p-2">
      <TokenCombobox
        selected={activePool}
        setSelected={(pool) => {
          router.push(`/trade/${pool.groupPk.toBase58()}`);
        }}
      />
      <div className="flex items-center gap-3 pr-2 py-1">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Price</span>
          <span className="text-sm">${dynamicNumeralFormatter(entryPrice, { maxDisplay: 100 })}</span>
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
