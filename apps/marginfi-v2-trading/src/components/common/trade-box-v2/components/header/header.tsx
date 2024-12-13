import { IconChevronDown } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import * as React from "react";
import { TokenCombobox } from "~/components/common/TokenCombobox";
import { ArenaPoolV2Extended } from "~/store/tradeStoreV2";

interface HeaderProps {
  activePool: ArenaPoolV2Extended;
}

export const Header = ({ activePool }: HeaderProps) => {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between p-2 border-b-2 border-border mb-2">
      <TokenCombobox
        selected={activePool}
        setSelected={(pool) => {
          router.push(`/trade/${pool.groupPk.toBase58()}`);
        }}
      >
        <div className="flex items-center justify-center font-medium text-base hover:bg-accent translate-x-1.5 transition-colors cursor-pointer rounded-md px-2 py-1 gap-2">
          <Image
            src={activePool.tokenBank.meta.tokenLogoUri}
            alt={activePool.tokenBank.meta.tokenSymbol}
            width={24}
            height={24}
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
          <span className="text-sm">$122.00</span>
        </div>
        <div className="flex flex-col items-end ">
          <span className="text-xs text-muted-foreground">24h volume</span>
          <span className="text-sm">$1.65m</span>
        </div>
      </div>
    </div>
  );
};
