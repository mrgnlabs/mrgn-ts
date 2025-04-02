import React from "react";

import Image from "next/image";
import { useRouter } from "next/router";

import { ArenaPoolSummary } from "~/types";

import { CommandList, CommandEmpty, CommandGroup, CommandItem } from "~/components/ui/command";
import { dynamicNumeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common/dist/utils/formatters.utils";
import { shortenAddress } from "@mrgnlabs/mrgn-common/dist/utils/conversion.utils";
import { cn } from "~/theme";

type SearchListProps = {
  pools: ArenaPoolSummary[];
  size?: "default" | "sm";
  setOpen: (open: boolean) => void;
};

const SearchList = ({ pools, setOpen, size = "default" }: SearchListProps) => {
  return (
    <CommandList>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup className={cn("h-[340px] overflow-y-auto mt-6", size === "sm" && "mt-2")}>
        {pools.map((pool, i) => (
          <SearchItem key={i} pool={pool} onClose={() => setOpen(false)} size={size} />
        ))}
      </CommandGroup>
    </CommandList>
  );
};

type SearchItemProps = {
  pool: ArenaPoolSummary;
  onClose?: () => void;
  size?: "default" | "sm";
};

const SearchItem = ({ pool, onClose, size = "default" }: SearchItemProps) => {
  const router = useRouter();

  return (
    <CommandItem
      key={pool.groupPk.toBase58()}
      className={cn("group even:bg-muted/50 data-[selected]:even:bg-muted/50 py-2")}
      value={pool.groupPk.toBase58()}
      onSelect={() => {
        router.push(`/trade/${pool.groupPk.toBase58()}`);
        onClose?.();
      }}
    >
      <div className="flex items-center gap-2 justify-between w-full">
        <div className="flex items-center gap-3.5 justify-between cursor-pointer">
          <div className="relative">
            <Image
              src={pool.tokenSummary.tokenLogoUri}
              width={size === "sm" ? 30 : 32}
              height={size === "sm" ? 30 : 32}
              alt={pool.tokenSummary.tokenName}
              className={cn("rounded-full border object-cover z-10", size === "sm" && "w-[30px] h-[30px]")}
            />
            <Image
              src={pool.quoteSummary.tokenLogoUri}
              width={size === "sm" ? 16 : 18}
              height={size === "sm" ? 16 : 18}
              alt={pool.quoteSummary.tokenName}
              className={cn("rounded-full object-cover absolute -bottom-1 -right-1", size === "sm" && "w-4 h-4")}
            />
          </div>
          <div className="flex flex-col justify-center">
            <span
              className={cn(
                "font-normal group-data-[selected]:font-medium group-data-[selected]:border-b group-data-[selected]:border-foreground/50"
              )}
            >
              {pool.tokenSummary.tokenSymbol} / {pool.quoteSummary.tokenSymbol}
            </span>
            <span className="text-xs text-muted-foreground">{shortenAddress(pool.groupPk)}</span>
          </div>
        </div>

        <p className={cn("w-2/5", size === "sm" && "w-1/3 flex flex-col text-xs")}>
          <span>
            $
            {dynamicNumeralFormatter(pool.tokenSummary.tokenVolumeData.price, {
              ignoreMinDisplay: true,
            })}{" "}
          </span>
          {pool.tokenSummary.tokenVolumeData.priceChange24h && (
            <span
              className={cn(
                "text-xs ml-1",
                pool.tokenSummary.tokenVolumeData.priceChange24h > 0 ? "text-mrgn-green" : "text-mrgn-error",
                size === "sm" && "ml-0"
              )}
            >
              {pool.tokenSummary.tokenVolumeData.priceChange24h > 0 && "+"}
              {percentFormatter.format(pool.tokenSummary.tokenVolumeData.priceChange24h / 100)}
            </span>
          )}
        </p>
      </div>
    </CommandItem>
  );
};

export { SearchList, SearchItem };
