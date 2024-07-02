import React from "react";

import Image from "next/image";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { percentFormatter } from "@mrgnlabs/mrgn-common";
import { IconChevronDown, IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

import { useTradeStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Button } from "~/components/ui/button";

import type { TokenData } from "~/types";

type TokenComboboxProps = {
  selected: ExtendedBankInfo | null;
  setSelected: (bank: ExtendedBankInfo) => void;
};

export const TokenCombobox = ({ selected, setSelected }: TokenComboboxProps) => {
  const [open, setOpen] = React.useState(false);
  const [extendedBankInfos] = useTradeStore((state) => [state.banks]);

  const banks = React.useMemo(() => {
    return extendedBankInfos.sort(
      (a, b) => b.info.oraclePrice.priceRealtime.price.toNumber() - a.info.oraclePrice.priceRealtime.price.toNumber()
    );
  }, [extendedBankInfos]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="lg" className="w-full justify-start pr-4 pl-3 py-3">
          {selected !== null ? (
            <>
              <Image
                src={getTokenImageURL(selected.meta.tokenSymbol)}
                width={24}
                height={24}
                alt={`Pool ${selected}`}
                className="rounded-full"
              />{" "}
              {selected.meta.tokenSymbol}
            </>
          ) : (
            <>Select pool</>
          )}
          <IconChevronDown size={18} className="ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Select pool..." />
          <CommandList className="max-h-[390px]">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {banks.map((bank, index) => (
                <CommandItem
                  key={index}
                  className="gap-3 py-2 cursor-pointer rounded-md aria-selected:text-primary"
                  value={bank.meta.tokenSymbol}
                  onSelect={(value) => {
                    const selBank = extendedBankInfos.find((bank) => bank.meta.tokenSymbol.toLowerCase() === value);
                    if (!selBank) return;
                    setSelected(selBank);
                    setOpen(false);
                  }}
                >
                  <Image
                    src={getTokenImageURL(bank.meta.tokenSymbol)}
                    width={32}
                    height={32}
                    alt={bank.meta.tokenName}
                    className="rounded-full"
                  />
                  <span>{bank.meta.tokenSymbol}</span>
                  <TokenTrending bank={bank} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const TokenTrending = ({ bank }: { bank: ExtendedBankInfo }) => {
  const [tokenData, setTokenData] = React.useState<TokenData | null>(null);

  React.useEffect(() => {
    const fetchTokenData = async () => {
      const response = await fetch(`/api/birdeye/token?address=${bank.info.state.mint.toBase58()}`);

      if (!response.ok) return;

      const tokenData = await response.json();

      setTokenData(tokenData);
    };

    fetchTokenData();
  }, [bank]);

  if (!tokenData) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 ml-auto",
        tokenData?.priceChange24h > 1 ? "text-mrgn-success" : "text-mrgn-error"
      )}
    >
      {percentFormatter.format(tokenData?.priceChange24h / 100)}
      {tokenData?.priceChange24h > 1 ? <IconTrendingUp size={16} /> : <IconTrendingDown size={16} />}
    </div>
  );
};
