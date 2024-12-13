import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { IconChevronDown } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import * as React from "react";
import { TokenCombobox } from "~/components/common/TokenCombobox";
import { ArenaPoolV2Extended } from "~/store/tradeStoreV2";

interface HeaderProps {
  activePool: ArenaPoolV2Extended;
  entryPrice: number;
  volume: number | undefined;
}

export const Header = ({ activePool, entryPrice, volume }: HeaderProps) => {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between border-b-2 border-border mb-2 px-4 pt-3 pb-3">
      <TokenCombobox
        selected={activePool}
        setSelected={(pool) => {
          router.push(`/trade/${pool.groupPk.toBase58()}`);
        }}
      >
        <div className="flex items-center justify-center font-medium text-base hover:bg-accent transition-colors cursor-pointer rounded-md  gap-2">
          <Image
            src={activePool.tokenBank.meta.tokenLogoUri}
            alt={activePool.tokenBank.meta.tokenSymbol}
            width={28}
            height={28}
            className="bg-background border rounded-full lg:mb-0"
          />
          <h1 className="flex items-center gap-1 ">
            {activePool.tokenBank.meta.tokenName} <IconChevronDown size={18} />
          </h1>
        </div>
      </TokenCombobox>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end ">
          <span className="text-xs text-muted-foreground">Entry price</span>
          <span className="text-sm">${dynamicNumeralFormatter(entryPrice, { maxDisplay: 100 })}</span>
        </div>
        {volume && (
          <div className="flex flex-col items-end ">
            <span className="text-xs text-muted-foreground">24h volume</span>
            <span className="text-sm">${dynamicNumeralFormatter(volume, { maxDisplay: 10000 })}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// TODO: add entry price and volume
