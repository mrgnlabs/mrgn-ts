import React from "react";

import { useRouter } from "next/router";

import { ArenaPoolSummary } from "~/types";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import Link from "next/link";
import { useTradeStoreV2 } from "~/store";
import { percentFormatter } from "@mrgnlabs/mrgn-common";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "~/theme";

type SearchDialogProps = {
  open: boolean;
  pools: ArenaPoolSummary[];
  setOpen: (open: boolean) => void;
  filter?: (value: string, search: string) => number;
};

const SearchDialog = ({ open, setOpen, pools, filter }: SearchDialogProps) => {
  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      commandProps={{
        filter,
      }}
    >
      <CommandInput placeholder="Search pools by token or mint address..." autoFocus />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup className="h-[340px] overflow-y-auto mt-6">
          {pools.map((pool, i) => (
            <SearchItem
              key={i}
              pool={pool}
              className={cn("odd:bg-muted/50 data-[selected]:odd:bg-muted/50")}
              onClose={() => setOpen(false)}
            />
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

const SearchItem = ({
  pool,
  className,
  onClose,
}: {
  pool: ArenaPoolSummary;
  className?: string;
  onClose?: () => void;
}) => {
  const router = useRouter();
  const [tokenDataByMint] = useTradeStoreV2((state) => [state.tokenDataByMint]);

  const { tokenData, quoteTokenData } = React.useMemo(() => {
    const tokenData = tokenDataByMint[pool.tokenSummary.mint.toBase58()];
    const quoteTokenData = tokenDataByMint[pool.quoteSummary.mint.toBase58()];
    return { tokenData, quoteTokenData };
  }, [pool, tokenDataByMint]);

  return (
    <CommandItem
      key={pool.groupPk.toBase58()}
      className={cn("group", className)}
      onSelect={() => {
        router.push(`/trade/${pool.groupPk.toBase58()}`);
        onClose?.();
      }}
    >
      <div className="flex items-center gap-2 justify-between w-full">
        <div className="flex items-center gap-3.5 justify-between cursor-pointer">
          <div className="relative">
            <img
              src={pool.tokenSummary.tokenLogoUri}
              width={32}
              height={32}
              alt={pool.tokenSummary.tokenName}
              className="rounded-full border h-[32px] w-[32px] object-cover z-10"
            />
            <img
              src={pool.quoteSummary.tokenLogoUri}
              width={32}
              height={32}
              alt={pool.quoteSummary.tokenName}
              className="rounded-full h-[18px] w-[18px] object-cover absolute -bottom-1 -right-1"
            />
          </div>
          <span className="font-normal group-data-[selected]:font-medium group-data-[selected]:border-b group-data-[selected]:border-foreground/50">
            {pool.tokenSummary.tokenSymbol} / {pool.quoteSummary.tokenSymbol}
          </span>
        </div>

        {tokenData && tokenData && (
          <p className="w-2/5">
            $
            {dynamicNumeralFormatter(tokenData.price, {
              ignoreMinDisplay: true,
            })}{" "}
            {tokenData.priceChange24h && (
              <span
                className={cn("text-xs ml-1", tokenData.priceChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}
              >
                {tokenData.priceChange24h > 0 && "+"}
                {percentFormatter.format(tokenData.priceChange24h / 100)}
              </span>
            )}
          </p>
        )}
      </div>
    </CommandItem>
  );
};

export { SearchDialog };
