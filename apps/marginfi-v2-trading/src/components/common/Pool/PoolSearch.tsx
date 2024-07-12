import React from "react";

import Image from "next/image";
import { useRouter } from "next/router";

import { useDebounce } from "@uidotdev/usehooks";
import { usdFormatter, percentFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore } from "~/store";
import { cn, getTokenImageURL } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";

import type { TokenData } from "~/types";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

type PoolSearchProps = {
  size?: "sm" | "lg";
  maxResults?: number;
  additionalContent?: React.ReactNode;
  additionalContentQueryMin?: number;
  onBankSelect?: () => void;
  showNoResults?: boolean;
};

export const PoolSearch = ({
  size = "lg",
  maxResults = 5,
  additionalContent,
  additionalContentQueryMin = 3,
  onBankSelect,
  showNoResults = true,
}: PoolSearchProps) => {
  const router = useRouter();
  const [banks, searchBanks, searchResults, resetActiveGroup, resetSearchResults] = useTradeStore((state) => [
    state.banks,
    state.searchBanks,
    state.searchResults,
    state.resetActiveGroup,
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
            className={cn(
              "py-1.5 h-auto text-lg bg-transparent outline-none focus-visible:ring-0 md:text-xl md:py-3",
              size === "sm" && "text-base md:text-lg md:py-2.5"
            )}
            value={searchQuery}
            onValueChange={(value) => setSearchQuery(value)}
          />
        </div>
        <div className={cn(size === "lg" && "absolute top-10 w-full z-20 md:top-14")}>
          {searchResults.length > 0 && (
            <CommandGroup className={cn(size === "lg" && "shadow-lg md:w-4/5 md:mx-auto")}>
              {searchResults.slice(0, maxResults).map((result) => {
                const address = result.info.rawBank.mint.toBase58();
                const tokenInfo = tokenData ? tokenData[address] : null;

                return (
                  <CommandItem
                    key={address}
                    value={result.address.toBase58()}
                    className={cn(size === "sm" ? "text-sm" : "py-4")}
                    onSelect={(value) => {
                      resetActiveGroup();
                      const bank = banks.find((bank) => bank.address.toBase58().toLowerCase() === value);

                      if (!bank) return;
                      router.push(`/pools/${bank.address.toBase58()}`);
                      if (onBankSelect) onBankSelect();
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <Image
                        src={getTokenImageURL(result.meta.tokenSymbol)}
                        width={size === "sm" ? 28 : 32}
                        height={size === "sm" ? 28 : 32}
                        alt={result.meta.tokenSymbol}
                        className="rounded-full"
                      />
                      <h3>
                        {result.meta.tokenName} ({result.meta.tokenSymbol})
                      </h3>
                    </div>
                    {tokenInfo && (
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
                              {tokenInfo.price > 0.01
                                ? usdFormatter.format(tokenInfo.price)
                                : `$${tokenInfo.price.toExponential(2)}`}
                            </span>

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
                        <div className="hidden w-[130px] md:block">
                          <dt className="text-muted-foreground">Vol 24hr:</dt>
                          <dd className="space-x-2">
                            <span>${numeralFormatter(tokenInfo.volume24h)}</span>
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
