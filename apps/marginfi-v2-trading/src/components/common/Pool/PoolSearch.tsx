import React from "react";

import Image from "next/image";

import { useDebounce } from "@uidotdev/usehooks";
import { usdFormatter, percentFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore } from "~/store";
import { cn, getTokenImageURL } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";

import type { TokenData } from "~/types";

export const PoolSearch = () => {
  const [searchBanks, searchResults, resetSearchResults] = useTradeStore((state) => [
    state.searchBanks,
    state.searchResults,
    state.resetSearchResults,
  ]);
  const [tokenData, setTokenData] = React.useState<{
    [address: string]: TokenData;
  } | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!debouncedSearchQuery.length) {
      resetSearchResults();
      return;
    }
    searchBanks(debouncedSearchQuery);
  }, [debouncedSearchQuery, searchBanks, resetSearchResults]);

  React.useEffect(() => {
    const fetchTokenData = async (address: string) => {
      const tokenResponse = await fetch(`/api/birdeye/token?address=${address}`);

      if (!tokenResponse.ok) {
        console.error("Failed to fetch token data");
        return null;
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData) {
        console.error("Failed to parse token data");
        return null;
      }

      return tokenData;
    };

    const fetchAllTokenData = async () => {
      const tokenDataMap: { [address: string]: TokenData } = {};
      for (const result of searchResults) {
        const address = result.info.rawBank.mint.toBase58();
        const data = await fetchTokenData(address);
        if (data) {
          tokenDataMap[address] = data;
        }
      }
      setTokenData(tokenDataMap);
    };

    if (searchResults.length > 0) {
      fetchAllTokenData();
    }
  }, [searchResults]);

  return (
    <div className="relative w-full">
      <Command shouldFilter={false}>
        <div className="border border-[#4E5156] rounded-full px-2">
          <CommandInput
            ref={searchInputRef}
            placeholder={isMobile ? "Search tokens..." : "Search tokens by name, symbol, or mint address..."}
            className="py-1.5 h-auto text-lg bg-transparent outline-none focus-visible:ring-0 md:text-xl md:py-3"
            value={searchQuery}
            onValueChange={(value) => setSearchQuery(value)}
          />
        </div>
        {searchResults.length > 0 && (
          <CommandGroup>
            {searchResults.map((result) => {
              const address = result.info.rawBank.mint.toBase58();
              const tokenInfo = tokenData ? tokenData[address] : null;

              return (
                <CommandItem
                  key={address}
                  onClick={() => {
                    console.log("clicked", result);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <Image
                      src={getTokenImageURL(result.meta.tokenSymbol)}
                      width={32}
                      height={32}
                      alt={result.meta.tokenSymbol}
                      className="rounded-full"
                    />
                    <h3>
                      {result.meta.tokenName} ({result.meta.tokenSymbol})
                    </h3>
                  </div>
                  {tokenInfo && (
                    <dl className="flex items-center gap-2 text-sm md:ml-auto">
                      <div className="space-y-0.5 w-[130px]">
                        <dt className="text-muted-foreground">Price:</dt>
                        <dd>
                          {tokenInfo.price > 0.01
                            ? usdFormatter.format(tokenInfo.price)
                            : `$${tokenInfo.price.toExponential(2)}`}

                          <span
                            className={cn(
                              "text-xs",
                              tokenInfo.volumeChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error"
                            )}
                          >
                            {tokenInfo.priceChange24h > 0 && "+"}
                            {percentFormatter.format(tokenInfo.priceChange24h / 100)}
                          </span>
                        </dd>
                      </div>
                      <div className="space-y-0.5 w-[130px]">
                        <dt className="text-muted-foreground">Vol 24hr:</dt>
                        <dd>
                          ${numeralFormatter(tokenInfo.volume24h)}
                          <span
                            className={cn(
                              "text-xs",
                              tokenInfo.volumeChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error"
                            )}
                          >
                            {tokenInfo.volumeChange24h > 0 && "+"}
                            {percentFormatter.format(tokenInfo.volumeChange24h / 100)}
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
        {searchQuery.length > 0 && searchResults.length === 0 && <CommandEmpty>No results found</CommandEmpty>}
      </Command>
    </div>
  );
};
