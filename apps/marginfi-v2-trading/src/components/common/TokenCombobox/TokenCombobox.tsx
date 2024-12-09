import React from "react";

import Image from "next/image";
import { IconChevronDown } from "@tabler/icons-react";

import { percentFormatter, tokenPriceFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { Desktop, Mobile, cn } from "@mrgnlabs/mrgn-utils";

import { useTradeStore, useTradeStoreV2 } from "~/store";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Button } from "~/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";

import type { GroupData } from "~/store/tradeStore";
import { ArenaPoolV2Extended } from "~/store/tradeStoreV2";
import { useExtendedPools } from "~/hooks/useExtendedPools";

type TokenComboboxProps = {
  selected: ArenaPoolV2Extended | null;
  setSelected: (pool: ArenaPoolV2Extended) => void;
  children?: React.ReactNode;
};

export const TokenCombobox = ({ selected, setSelected, children }: TokenComboboxProps) => {
  const [open, setOpen] = React.useState(false);

  const arenaPools = useExtendedPools();

  // const groups = Array.from(arenaPools.values()).sort((a, b) => {
  //   return a.pool.poolData && b.pool.poolData ? b.pool.poolData.totalLiquidity - a.pool.poolData.totalLiquidity : 0;
  // });

  const arenaPoolsSorted = React.useMemo(() => {
    return Object.values(arenaPools).sort((a, b) => {
      const aTokenPrice = a.tokenBank.info.oraclePrice.priceRealtime.price.toNumber();
      const aQuotePrice = a.quoteBank.info.oraclePrice.priceRealtime.price.toNumber();
      const aTokenDeposit = a.tokenBank.info.state.totalDeposits;
      const aQuoteDeposit = a.quoteBank.info.state.totalDeposits;

      const bTokenPrice = b.tokenBank.info.oraclePrice.priceRealtime.price.toNumber();
      const bQuotePrice = b.quoteBank.info.oraclePrice.priceRealtime.price.toNumber();
      const bTokenDeposit = b.tokenBank.info.state.totalDeposits;
      const bQuoteDeposit = b.quoteBank.info.state.totalDeposits;

      return aTokenPrice * aTokenDeposit - bTokenPrice * bTokenDeposit;
    });
  }, [arenaPools]);

  return (
    <>
      <Desktop>
        <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
          <DialogTrigger asChild>
            <div>
              {children ? (
                children
              ) : (
                <TokenTrigger
                  tokenSymbol={selected?.tokenBank.meta.tokenSymbol}
                  logoUri={selected?.tokenBank.meta.tokenLogoUri}
                />
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="p-4 bg-background m-0" hideClose={true} hidePadding={true} size="sm" position="top">
            <DialogHeader className="sr-only">
              <DialogTitle>Select a token</DialogTitle>
              <DialogDescription>Select a token to trade</DialogDescription>
            </DialogHeader>
            <div className="h-[500px] relative overflow-auto">
              <Command>
                <CommandInput placeholder="Select pool..." autoFocus={true} />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {arenaPoolsSorted.map((pool, index) => (
                      <CommandItem
                        key={index}
                        className="gap-3 py-2 cursor-pointer rounded-md aria-selected:text-primary"
                        value={pool.groupPk.toBase58().toLowerCase()}
                        onSelect={(value) => {
                          const selectedPool = arenaPoolsSorted.find(
                            (pool) => pool.groupPk.toBase58().toLowerCase() === value
                          );
                          if (!selectedPool) return;
                          setSelected(selectedPool);
                          setOpen(false);
                        }}
                      >
                        <Image
                          src={pool.tokenBank.meta.tokenLogoUri}
                          width={32}
                          height={32}
                          alt={pool.tokenBank.meta.tokenName}
                          className="rounded-full"
                        />
                        <span>{pool.tokenBank.meta.tokenSymbol}</span>
                        {pool.tokenBank.tokenData && (
                          <div className="flex items-center justify-between gap-1 w-[40%] text-xs ml-auto text-muted-foreground">
                            <span>
                              {tokenPriceFormatter(pool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())}
                            </span>
                            <span
                              className={cn(
                                pool.tokenBank.tokenData?.priceChange24hr > 1 ? "text-mrgn-success" : "text-mrgn-error"
                              )}
                            >
                              {pool.tokenBank.tokenData?.priceChange24hr > 1 ? "+" : ""}
                              {percentFormatter.format(pool.tokenBank.tokenData?.priceChange24hr / 100)}
                            </span>
                          </div>
                        )}
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
              {children ? (
                children
              ) : (
                <TokenTrigger
                  tokenSymbol={selected?.tokenBank.meta.tokenSymbol}
                  logoUri={selected?.tokenBank.meta.tokenLogoUri}
                />
              )}
            </div>
          </DrawerTrigger>
          <DrawerContent className="h-full z-[55] mt-0 p-2" hideTopTrigger={true}>
            <DialogHeader className="sr-only">
              <DialogTitle>Select a token</DialogTitle>
              <DialogDescription>Select a token to trade</DialogDescription>
            </DialogHeader>
            <Command>
              <CommandInput placeholder="Select pool..." autoFocus={true} />
              <CommandList className="max-h-[390px]">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {arenaPoolsSorted.map((pool, index) => (
                    <CommandItem
                      key={index}
                      className="gap-3 py-2 cursor-pointer rounded-md aria-selected:text-primary"
                      value={pool.groupPk.toBase58().toLowerCase()}
                      onSelect={(value) => {
                        const selectedPool = arenaPoolsSorted.find(
                          (pool) => pool.groupPk.toBase58().toLowerCase() === value
                        );
                        if (!selectedPool) return;
                        setSelected(selectedPool);
                        setOpen(false);
                      }}
                    >
                      <Image
                        src={pool.tokenBank.meta.tokenLogoUri}
                        width={32}
                        height={32}
                        alt={pool.tokenBank.meta.tokenName}
                        className="rounded-full"
                      />
                      <span>{pool.tokenBank.meta.tokenSymbol}</span>
                      {pool.tokenBank.tokenData && (
                        <div className="flex items-center justify-between gap-1 text-sm ml-auto w-full text-muted-foreground max-w-[160px]">
                          <span>
                            {tokenPriceFormatter(pool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())}
                          </span>
                          <span
                            className={cn(
                              pool.tokenBank.tokenData?.priceChange24hr > 1 ? "text-mrgn-success" : "text-mrgn-error"
                            )}
                          >
                            {percentFormatter.format(pool.tokenBank.tokenData?.priceChange24hr / 100)}
                          </span>
                        </div>
                      )}
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

type TokenTriggerProps = {
  logoUri?: string;
  tokenSymbol?: string;
};

const TokenTrigger = ({ logoUri, tokenSymbol }: TokenTriggerProps) => {
  return (
    <Button variant="secondary" size="lg" className="relative w-full justify-start pr-8 pl-3 py-3">
      {logoUri && tokenSymbol ? (
        <>
          <Image src={logoUri} width={24} height={24} alt={`Pool ${tokenSymbol}`} className="rounded-full" />{" "}
          {tokenSymbol}
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
