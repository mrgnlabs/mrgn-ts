import React from "react";

import Image from "next/image";

import { tokenPriceFormatter, numeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";
import { IconCommand, IconX } from "@tabler/icons-react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { Button } from "~/components/ui/button";

import type { FuseResult } from "fuse.js";
import type { GroupData } from "~/store/tradeStore";

type PoolSearchDefaultProps = {
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

export const PoolSearchDefault = ({
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
}: PoolSearchDefaultProps) => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === "Escape") {
        searchInputRef.current?.blur();
        resetSearch();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [resetSearch]);

  return (
    <div className="relative w-full px-4 md:px-0">
      <Command shouldFilter={false} onKeyDown={(event) => event.key === "Escape" && resetSearch()}>
        <div
          className={cn(
            "border border-muted-foreground/25 rounded-full px-2 transition-colors",
            isFocused && "border-primary"
          )}
        >
          <CommandInput
            ref={searchInputRef}
            placeholder={"Search tokens by name, symbol, or mint address..."}
            className={cn(
              "py-2 h-auto bg-transparent outline-none focus-visible:ring-0 md:text-lg md:py-3",
              size === "sm" && "text-base md:text-lg md:py-2.5"
            )}
            value={searchQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onValueChange={(value) => setSearchQuery(value)}
          />
          {searchQuery.length > 0 && (
            <IconX
              size={18}
              className="absolute text-muted-foreground right-6 top-1/2 -translate-y-1/2 cursor-pointer transition-colors hover:text-primary md:right-4"
              onClick={() => {
                resetSearch();
              }}
            />
          )}

          <Button
            size="sm"
            variant="outline"
            className={cn(
              searchQuery.length > 0 ? "hidden" : "flex",
              "absolute text-[10px] right-6 top-1/2 -translate-y-1/2 gap-0.5 px-1.5 py-0.5 h-auto text-muted-foreground md:right-4 md:text-xs"
            )}
            onClick={() => {
              searchInputRef.current?.focus();
            }}
          >
            <IconCommand size={14} />K
          </Button>
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
                        src={tokenBank.meta.tokenLogoUri}
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
                        <div className="w-[110px] md:w-[150px]">
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
                        <div className="hidden w-[150px] md:block">
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
      </Command>
    </div>
  );
};
