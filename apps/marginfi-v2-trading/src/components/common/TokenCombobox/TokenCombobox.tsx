import React from "react";

import Image from "next/image";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { IconChevronDown, IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

import { useTradeStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Button } from "~/components/ui/button";

import type { TokenData } from "~/types";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Desktop, Mobile } from "~/mediaQueries";
import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";

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
    <>
      <Desktop>
        <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
          <DialogTrigger asChild>
            <div>
              <TokenTrigger selected={selected} />
            </div>
          </DialogTrigger>
          <DialogContent className="p-4 bg-background m-0" hideClose={true} hidePadding={true} size="sm" position="top">
            <div className="h-[500px] relative overflow-auto">
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
                          const selBank = extendedBankInfos.find(
                            (bank) => bank.meta.tokenSymbol.toLowerCase() === value
                          );
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
                        <TokenData bank={bank} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </DialogContent>
        </Dialog>
      </Desktop>
      <Mobile>
        <Drawer open={open} onOpenChange={(open) => setOpen(open)}>
          <DrawerTrigger asChild>
            <div>
              <TokenTrigger selected={selected} />
            </div>
          </DrawerTrigger>
          <DrawerContent className="h-full z-[55] mt-0" hideTopTrigger={true}>
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
                      <TokenData bank={bank} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </DrawerContent>
        </Drawer>
      </Mobile>
    </>
  );
};

const TokenTrigger = ({ selected }: { selected: ExtendedBankInfo | null }) => {
  return (
    <Button variant="secondary" size="lg" className="relative w-full justify-start pr-8 pl-3 py-3">
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
      <div>
        <IconChevronDown size={18} className="ml-auto" />
      </div>
    </Button>
  );
};

const TokenData = ({ bank }: { bank: ExtendedBankInfo }) => {
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
    <div className="flex items-center gap-1 text-sm ml-auto w-[110px] text-muted-foreground">
      <span>
        {tokenData.price > 0.01 ? usdFormatter.format(tokenData.price) : `$${tokenData.price.toExponential(2)}`}
      </span>
      <span className={cn("text-xs", tokenData?.priceChange24h > 1 ? "text-mrgn-success" : "text-mrgn-error")}>
        {percentFormatter.format(tokenData?.priceChange24h / 100)}
      </span>
    </div>
  );
};
