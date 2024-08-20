import React from "react";

import Image from "next/image";

import { tokenPriceFormatter, numeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";
import { IconX } from "@tabler/icons-react";

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
  size: "sm" | "lg";
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
  size,
  additionalContent,
  additionalContentQueryMin,
  showNoResults,
  onBankSelect,
  maxResults = 5,
}: PoolSearchDialogProps) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative w-full px-4 md:px-0">
      <button
        onClick={() => setOpen(true)}
        className="border border-muted-foreground/25 rounded-full px-2 transition-colors"
      >
        <Input
          placeholder={"Search tokens..."}
          className={cn("py-2 h-auto bg-transparent outline-none focus-visible:ring-0 md:text-lg md:py-3")}
        />
        {searchQuery.length > 0 && (
          <IconX
            size={16}
            className="absolute text-muted-foreground right-6 top-1/2 -translate-y-1/2 cursor-pointer transition-colors hover:text-primary md:right-4"
            onClick={() => {
              resetSearch();
            }}
          />
        )}
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} commandProps={{ shouldFilter: false }}>
        <div className="border border-muted-foreground/25 rounded-full px-2 transition-colors">
          <CommandInput
            placeholder={"Search tokens..."}
            className={cn(
              "py-2 h-auto bg-transparent outline-none focus-visible:ring-0 md:text-lg md:py-3",
              size === "sm" && "text-base md:text-lg md:py-2.5"
            )}
            value={searchQuery}
            onValueChange={(value) => setSearchQuery(value)}
          />
          {searchQuery.length > 0 && (
            <IconX
              size={16}
              className="absolute text-muted-foreground right-6 top-1/2 -translate-y-1/2 cursor-pointer transition-colors hover:text-primary md:right-4"
              onClick={() => {
                resetSearch();
              }}
            />
          )}
        </div>
        <div className={cn(size === "lg" && "absolute top-10 w-full z-20 md:top-14")}>
          {searchResults.length > 0 && (
            <CommandGroup className={cn(size === "lg" && "shadow-lg md:w-4/5 md:mx-auto")}>
              {searchResults.slice(0, maxResults).map((result) => {
                const group = result.item;
                const address = group.groupPk.toBase58();
                const tokenBank = group.pool.token;

                return (
                  <CommandItem
                    key={address}
                    value={address}
                    className={cn(size === "sm" ? "text-sm" : "py-4")}
                    onSelect={onBankSelect}
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={getTokenImageURL(tokenBank.info.state.mint.toBase58())}
                        width={size === "sm" ? 28 : 32}
                        height={size === "sm" ? 28 : 32}
                        alt={tokenBank.meta.tokenSymbol}
                        className="rounded-full"
                      />
                      <h3>
                        {tokenBank.meta.tokenName} ({tokenBank.meta.tokenSymbol})
                      </h3>
                    </div>
                    {tokenBank.tokenData && (
                      <dl
                        className={cn(
                          "flex items-center gap-2 text-xs ml-auto md:text-sm",
                          size === "sm" && "md:text-xs"
                        )}
                      >
                        <div className="w-[110px] md:w-[130px]">
                          <dt className="text-muted-foreground">Price:</dt>
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
