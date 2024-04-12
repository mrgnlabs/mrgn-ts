import React from "react";

import Image from "next/image";

import { PublicKey } from "@solana/web3.js";

import { cn } from "~/utils";

import { IconSearch } from "~/components/ui/icons";
import { Input } from "~/components/ui/input";

export type Token = {
  address: PublicKey;
  name: string;
  symbol: string;
  image: string;
  value: number;
  valueUSD: number;
  formattedValue: string;
  formattedValueUSD?: string;
};

type WalletTokensProps = {
  tokens: Token[];
  onTokenClick?: (token: Token) => void;
  className?: string;
};

export const WalletTokens = ({ tokens, onTokenClick, className }: WalletTokensProps) => {
  const [search, setSearch] = React.useState("");

  const filteredTokens = React.useMemo(() => {
    const q = search.toLowerCase();
    return tokens.filter((token) => token.name.toLowerCase().includes(q) || token.symbol.toLowerCase().includes(q));
  }, [tokens, search]);

  if (tokens.length === 0) return null;

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
        />
      </div>
      <div className="space-y-2 overflow-auto h-full">
        {filteredTokens.map((token, index) => (
          <button
            key={index}
            className={cn(
              "flex items-center justify-between font-normal bg-background-gray-dark p-3 rounded-md gap-4 w-full text-left transition-colors hover:bg-background-gray",
              onTokenClick && "cursor-pointer"
            )}
            onClick={() => onTokenClick?.(token)}
          >
            <div className="flex items-center gap-3 w-3/5">
              {token.image && (
                <Image src={token.image} alt={token.symbol} className="w-9 h-9 rounded-full" width={36} height={36} />
              )}
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{token.symbol}</span>
                <span className="text-xs text-muted-foreground">{token.name}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-right shrink-0">
              <span>
                {token.formattedValue} {token.symbol}
              </span>
              <span className="text-muted-foreground text-sm">{token.formattedValueUSD}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
