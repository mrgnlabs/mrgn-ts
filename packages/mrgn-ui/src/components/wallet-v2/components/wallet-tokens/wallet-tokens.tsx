import React from "react";

import Image from "next/image";

import { IconSearch } from "@tabler/icons-react";

import { cn } from "@mrgnlabs/mrgn-utils";

import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { TokenWalletData } from "../../wallet";

type WalletTokensProps = {
  tokens: TokenWalletData[];
  onTokenClick?: (token: TokenWalletData) => void;
  className?: string;
  isLoading?: boolean;
};

export const WalletTokens = ({ tokens, onTokenClick, className, isLoading = false }: WalletTokensProps) => {
  const [search, setSearch] = React.useState("");

  const filteredTokens = React.useMemo(() => {
    const q = search.toLowerCase();
    return tokens.filter((token) => token.name.toLowerCase().includes(q) || token.symbol.toLowerCase().includes(q));
  }, [tokens, search]);

  if (tokens.length === 0 && !isLoading) return null;

  return (
    <div className={cn("space-y-4 pt-1", className)}>
      <div className="relative">
        <IconSearch className="absolute left-3 top-3 text-muted-foreground" size={14} />
        <Input
          type="text"
          placeholder="Search tokens"
          className="w-full pl-8 border-input/75"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2 overflow-auto h-full pb-12">
        {isLoading
          ? // Skeleton loading state
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between font-normal bg-mfi-action-box-background p-3 rounded-md gap-4 w-full"
              >
                <div className="flex items-center gap-3 w-3/5">
                  <Skeleton className="w-9 h-9 rounded-full bg-muted-foreground/50" />
                  <div className="flex flex-col gap-0.5">
                    <Skeleton className="h-4 w-16 bg-muted-foreground/50" />
                    <Skeleton className="h-3 w-24 bg-muted-foreground/50" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-right shrink-0">
                  <Skeleton className="h-4 w-20 bg-muted-foreground/50" />
                  <Skeleton className="h-4 w-10 bg-muted-foreground/50" />
                </div>
              </div>
            ))
          : filteredTokens.map((token, index) => (
              <button
                key={index}
                className={cn(
                  "flex items-center justify-between font-normal bg-mfi-action-box-background p-3 rounded-md gap-4 w-full text-left transition-colors hover:bg-mfi-action-box-accent",
                  onTokenClick && "cursor-pointer"
                )}
                onClick={() => onTokenClick?.(token)}
              >
                <div className="flex items-center gap-3 w-3/5">
                  {token.image &&
                    (token.image.includes("mrgn-token-icons") ? (
                      <Image
                        src={token.image}
                        alt={token.symbol}
                        className="w-9 h-9 rounded-full"
                        width={36}
                        height={36}
                      />
                    ) : (
                      <img
                        src={token.image}
                        alt={token.symbol}
                        className="w-9 h-9 rounded-full"
                        width={36}
                        height={36}
                      />
                    ))}
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{token.symbol}</span>
                    <span className="text-xs text-muted-foreground">{token.name}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-right shrink-0">
                  <span>
                    {token.formattedValue} {token.symbol}
                  </span>

                  <span className="text-muted-foreground text-sm">
                    {token.valueUSD === 0 ? (
                      <Skeleton className="h-4 w-10 bg-muted-foreground/50" />
                    ) : (
                      token.formattedValueUSD
                    )}
                  </span>
                </div>
              </button>
            ))}
      </div>
    </div>
  );
};
