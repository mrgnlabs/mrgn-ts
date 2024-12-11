import { IconChevronDown } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import * as React from "react";
import { ArenaPoolV2Extended } from "~/store/tradeStoreV2";

interface HeaderProps {
  activePool: ArenaPoolV2Extended;
}

export const Header = ({ activePool }: HeaderProps) => {
  // TODO: change styling of this, this isnt the best

  return (
    <div className="flex items-center justify-between bg-accent px-2 py-2 rounded-xl">
      <Link className="flex items-center gap-1 text-2xl gap-2" href={`/trade/${activePool.groupPk.toBase58()}`}>
        <Image
          src={activePool.tokenBank.meta.tokenLogoUri}
          alt={activePool.tokenBank.meta.tokenSymbol}
          width={32}
          height={32}
          className="bg-background border rounded-full mb-2 lg:mb-0"
        />
        {activePool.tokenBank.meta.tokenSymbol}
        <IconChevronDown size={16} />
      </Link>
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end ">
          <span className="text-xs text-muted-foreground">Entry price</span>
          <span className="text-base">$122.00</span>
        </div>
        <div className="flex flex-col items-end ">
          <span className="text-xs text-muted-foreground">24h volume</span>
          <span className="text-base">$1.65m</span>
        </div>
      </div>
    </div>
  );
};
