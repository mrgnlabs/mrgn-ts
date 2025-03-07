import React from "react";
import type { FuseResult } from "fuse.js";
import Image from "next/image";
import { IconX, IconSearch } from "@tabler/icons-react";

import { cn } from "@mrgnlabs/mrgn-utils";
import { percentFormatter, dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { useTradeStoreV2 } from "~/store";
import { ArenaPoolSummary } from "~/types/trade-store.types";
import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";

type PoolSearchDialogProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resetSearch: () => void;
  searchResults: FuseResult<ArenaPoolSummary>[];
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
  const [banksByBankPk] = useTradeStoreV2((state) => [state.banksByBankPk]);

  return (
    <Drawer open={open} onOpenChange={(open) => setOpen(open)}>
      <DrawerTrigger className="relative w-full text-muted-foreground">
        <div className="border border-border text-sm py-2 pl-8 h-auto rounded-full text-left bg-transparent outline-none pointer-events-none focus-visible:ring-0 md:text-lg md:py-3 disabled:opacity-100">
          Search tokens...
        </div>
        <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" />
      </DrawerTrigger>
      <DrawerContent className="h-full z-[55] mt-0 p-2">
        <Command>
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
                  const pool = result.item;
                  const address = pool.groupPk.toBase58();
                  const tokenBank = banksByBankPk[pool.tokenSummary.bankPk.toBase58()];
                  const quoteBank = banksByBankPk[pool.quoteSummary.bankPk.toBase58()];

                  return (
                    <CommandItem key={address} value={address} className="py-4" onSelect={onBankSelect}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 relative">
                          <Image
                            src={tokenBank.meta.tokenLogoUri}
                            width={32}
                            height={32}
                            alt={tokenBank.meta.tokenSymbol}
                            className="rounded-full w-[32px] h-[32px] object-cover"
                          />
                          <Image
                            src={quoteBank.meta.tokenLogoUri}
                            width={16}
                            height={16}
                            alt={quoteBank.meta.tokenSymbol}
                            className="rounded-full w-[16px] h-[16px] object-cover absolute -right-1 -bottom-1"
                          />{" "}
                        </div>

                        <div className="flex flex-col gap-1">
                          <h3>{tokenBank.meta.tokenName}</h3>
                          <span className="text-xs text-muted-foreground">
                            {tokenBank.meta.tokenSymbol}/{quoteBank.meta.tokenSymbol}
                          </span>
                        </div>
                      </div>
                      {tokenBank.tokenData && quoteBank.tokenData && (
                        <dl className="flex items-center text-xs ml-auto md:text-sm md:gap-8">
                          <div>
                            <dt className="text-muted-foreground sr-only md:not-sr-only">Price:</dt>
                            <dd className="space-x-2">
                              {dynamicNumeralFormatter(tokenBank.tokenData.price / quoteBank.tokenData.price, {
                                ignoreMinDisplay: true,
                              })}{" "}
                              {quoteBank.meta.tokenSymbol}
                              {tokenBank.tokenData.priceChange24hr && quoteBank.tokenData.priceChange24hr && (
                                <span
                                  className={cn(
                                    "text-xs ml-1",
                                    tokenBank.tokenData.priceChange24hr - quoteBank.tokenData.priceChange24hr > 0
                                      ? "text-mrgn-green"
                                      : "text-mrgn-error"
                                  )}
                                >
                                  {tokenBank.tokenData.priceChange24hr - quoteBank.tokenData.priceChange24hr > 0 && "+"}
                                  {percentFormatter.format(
                                    (tokenBank.tokenData.priceChange24hr - quoteBank.tokenData.priceChange24hr) / 100
                                  )}
                                </span>
                              )}
                            </dd>
                          </div>
                          <div className="hidden w-[130px] md:block">
                            <dt className="text-muted-foreground">Vol 24hr:</dt>
                            <dd className="space-x-2">
                              <span>${dynamicNumeralFormatter(tokenBank.tokenData.volume24hr)}</span>
                              <span
                                className={cn(
                                  "text-xs",
                                  tokenBank.tokenData.volumeChange24hr > 0 ? "text-mrgn-green" : "text-mrgn-error"
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
        </Command>
      </DrawerContent>
    </Drawer>
  );
};
