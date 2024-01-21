import React from "react";

import Image from "next/image";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { IconCaretUpDownFilled } from "~/components/ui/icons";

export type Token = {
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
};

export const WalletTokens = ({ tokens }: WalletTokensProps) => {
  const [isTokensOpen, setIsTokensOpen] = React.useState(false);

  if (tokens.length === 0) return null;

  return (
    <div className="w-full mt-8 space-y-1">
      <h3 className="font-normal text-sm">Tokens</h3>
      {tokens.length === 1 && (
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isTokensOpen}
          className="w-full justify-start cursor-default hover:bg-transparent"
        >
          {tokens[0].image && (
            <Image src={tokens[0].image} alt={tokens[0].symbol} className="w-4 h-4 mr-1" width={16} height={16} />
          )}
          <span className="mr-1">{tokens[0].symbol}</span>
          <div className="text-xs space-x-2">
            {tokens[0].value > 0 && <span>{tokens[0].formattedValue}</span>}
            <span className="text-xs font-light">({tokens[0].formattedValueUSD})</span>
          </div>
        </Button>
      )}
      {tokens.length > 1 && (
        <Popover open={isTokensOpen} onOpenChange={setIsTokensOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" role="combobox" aria-expanded={isTokensOpen} className="w-full justify-start">
              {tokens[0].image && (
                <Image src={tokens[0].image} alt={tokens[0].symbol} className="w-4 h-4 mr-1" width={16} height={16} />
              )}
              <span className="mr-1">{tokens[0].symbol}</span>
              <div className="text-xs space-x-2">
                <span>{tokens[0].formattedValue}</span>
                <span className="text-xs font-light">({tokens[0].formattedValueUSD})</span>
              </div>
              <IconCaretUpDownFilled size={16} className="ml-auto shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[304px] m-0 z-[1000002]">
            <Command className="bg-accent border-none">
              <CommandInput placeholder="Search tokens..." className="h-9" />
              <CommandEmpty>No token found.</CommandEmpty>

              <CommandGroup>
                {tokens.slice(1).map((token, index) => (
                  <CommandItem
                    key={index}
                    className="flex items-center justify-start font-normal pl-3 aria-selected:bg-background-gray-dark aria-selected:text-white"
                  >
                    {token.image && (
                      <Image src={token.image} alt={token.symbol} className="w-4 h-4 mr-3" width={16} height={16} />
                    )}
                    <span className="mr-2">{token.symbol}</span>
                    <div className="text-xs space-x-2">
                      <span>{token.formattedValue}</span>
                      <span>({token.formattedValueUSD})</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
