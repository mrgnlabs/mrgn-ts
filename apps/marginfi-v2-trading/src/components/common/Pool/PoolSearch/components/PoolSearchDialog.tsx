import React from "react";

import Image from "next/image";

import { tokenPriceFormatter, numeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";
import { IconX, IconSearch } from "@tabler/icons-react";

import { cn, getTokenImageURL } from "~/utils";

import { CommandDialog, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { Input } from "~/components/ui/input";

import type { FuseResult } from "fuse.js";
import type { GroupData } from "~/store/tradeStore";

type PoolSearchDialogProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resetSearch: () => void;
  searchResults: FuseResult<GroupData>[];
  additionalContent: React.ReactNode;
  additionalContentQueryMin: number;
  showNoResults: boolean;
  onBankSelect: (value: string) => void;
  maxResults: number;
};

export const PoolSearchDialog = ({
  searchQuery,
  setSearchQuery,
  resetSearch,
  searchResults,
  additionalContent,
  additionalContentQueryMin,
  showNoResults,
  onBankSelect,
  maxResults = 5,
}: PoolSearchDialogProps) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative w-full">
      <button onClick={() => setOpen(true)} className="relative w-full text-muted-foreground">
        <div className="border border-border text-sm py-2 pl-8 h-auto rounded-full text-left bg-transparent outline-none pointer-events-none focus-visible:ring-0 md:text-lg md:py-3 disabled:opacity-100">
          Search tokens...
        </div>
        <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" />
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} commandProps={{ shouldFilter: false }}>
        <div className="p-4">
          <div className="relative border border-muted-foreground/25 rounded-full px-2 transition-colors">
            <CommandInput
              placeholder={"Search tokens..."}
              className="py-2 h-auto bg-transparent outline-none focus-visible:ring-0"
              autoFocus
              value={searchQuery}
              onValueChange={(value) => setSearchQuery(value)}
            />
            {searchQuery.length > 0 && (
              <IconX
                size={16}
                className="absolute text-muted-foreground right-4 top-1/2 -translate-y-1/2 cursor-pointer transition-colors hover:text-primary"
                onClick={() => {
                  setOpen(false);
                }}
              />
            )}
          </div>
          {searchResults.length > 0 && (
            <CommandGroup>
              {searchResults.slice(0, maxResults).map((result) => {
                const group = result.item;
                const address = group.groupPk.toBase58();
                const tokenBank = group.pool.token;

                return (
                  <CommandItem key={address} value={address} className="py-4" onSelect={onBankSelect}>
                    <div className="flex items-center gap-3">
                      <Image
                        src={getTokenImageURL(tokenBank.info.state.mint.toBase58())}
                        width={32}
                        height={32}
                        alt={tokenBank.meta.tokenSymbol}
                        className="rounded-full"
                      />
                      <h3>{tokenBank.meta.tokenSymbol}</h3>
                    </div>
                    {tokenBank.tokenData && (
                      <dl className="flex items-center text-xs ml-auto md:text-sm md:gap-8">
                        <div>
                          <dt className="text-muted-foreground sr-only md:not-sr-only">Price:</dt>
                          <dd className="space-x-2">
                            <span>
                              {tokenPriceFormatter(tokenBank.info.oraclePrice.priceRealtime.price.toNumber())}
                            </span>

                            <span
                              className={cn(
                                "text-xs",
                                tokenBank.tokenData.volumeChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                              )}
                            >
                              {tokenBank.tokenData.priceChange24hr > 0 && "+"}
                              {percentFormatter.format(tokenBank.tokenData.priceChange24hr / 100)}
                            </span>
                          </dd>
                        </div>
                        <div className="hidden w-[130px] md:block">
                          <dt className="text-muted-foreground">Vol 24hr:</dt>
                          <dd className="space-x-2">
                            <span>${numeralFormatter(tokenBank.tokenData.volume24hr)}</span>
                            <span
                              className={cn(
                                "text-xs",
                                tokenBank.tokenData.volumeChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                              )}
                            >
                              {tokenBank.tokenData.volumeChange24hr > 0 && "+"}
                              {percentFormatter.format(tokenBank.tokenData.volumeChange24hr / 100)}
                            </span>
                          </dd>
                        </div>
                      </dl>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
          {searchQuery.length > 0 && searchResults.length === 0 && showNoResults && (
            <CommandEmpty className="text-center mt-8 text-muted-foreground">No results found</CommandEmpty>
          )}
          {additionalContent && searchQuery.length >= additionalContentQueryMin && (
            <div className="flex justify-center w-full mt-8">{additionalContent}</div>
          )}
        </div>
      </CommandDialog>
    </div>
  );
};
