import React from "react";
import Image from "next/image";
import { IconChevronDown } from "@tabler/icons-react";

import { percentFormatter, tokenPriceFormatter } from "@mrgnlabs/mrgn-common";
import { Desktop, Mobile, cn } from "@mrgnlabs/mrgn-utils";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { ArenaPoolV2Extended } from "~/types/trade-store.types";
import { useExtendedPools } from "~/hooks/useExtendedPools";

type TokenComboboxProps = {
  selected: ArenaPoolV2Extended | null;
  setSelected: (pool: ArenaPoolV2Extended) => void;
  children?: React.ReactNode;
};

export const TokenCombobox = ({ selected, setSelected, children }: TokenComboboxProps) => {
  const [open, setOpen] = React.useState(false);

  const arenaPools = useExtendedPools();

  const arenaPoolsSorted = React.useMemo(() => {
    return Object.values(arenaPools).sort((a, b) => {
      const aTokenPrice = a.tokenBank.info.oraclePrice.priceRealtime.price.toNumber();
      const aTokenDeposit = a.tokenBank.info.state.totalDeposits;

      const bTokenPrice = b.tokenBank.info.oraclePrice.priceRealtime.price.toNumber();
      const bTokenDeposit = b.tokenBank.info.state.totalDeposits;

      return aTokenPrice * aTokenDeposit - bTokenPrice * bTokenDeposit;
    });
  }, [arenaPools]);

  return (
    <>
      <Desktop>
        <Popover open={open} onOpenChange={(open) => setOpen(open)}>
          <PopoverTrigger asChild>
            <div>{children ? children : <TokenTrigger selected={selected} open={open} />}</div>
          </PopoverTrigger>
          <PopoverContent className="p-4 bg-background m-0 w-[400px]" side="bottom" avoidCollisions={false}>
            <div className="h-[500px] relative overflow-auto">
              <Command
                filter={(value, search) => {
                  const selectedPool = arenaPoolsSorted.find((pool) => pool.groupPk.toBase58().toLowerCase() === value);
                  return selectedPool?.tokenBank.meta.tokenSymbol.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                }}
              >
                <CommandInput placeholder="Select pool..." autoFocus={true} />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {arenaPoolsSorted.map((pool, index) => (
                      <CommandItem
                        key={index}
                        className="gap-3 py-2 cursor-pointer rounded-md text-primary aria-selected:bg-accent transition-colors"
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
                        <div className="flex items-center gap-2 relative">
                          <Image
                            src={pool.tokenBank.meta.tokenLogoUri}
                            width={32}
                            height={32}
                            alt={pool.tokenBank.meta.tokenName}
                            className="rounded-full w-[32px] h-[32px] object-cover"
                          />
                          <Image
                            src={pool.quoteBank.meta.tokenLogoUri}
                            width={16}
                            height={16}
                            alt={pool.quoteBank.meta.tokenName}
                            className="rounded-full w-[16px] h-[16px] object-cover absolute -right-1 -bottom-1"
                          />
                        </div>

                        <span>
                          {pool.tokenBank.meta.tokenSymbol}/{pool.quoteBank.meta.tokenSymbol}
                        </span>
                        {pool.tokenBank.tokenData && (
                          <div className="flex items-center justify-between gap-1 w-[40%] text-xs ml-auto text-muted-foreground">
                            <span>
                              {tokenPriceFormatter(pool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())}
                            </span>
                            <span
                              className={cn(
                                pool.tokenBank.tokenData?.priceChange24hr > 1 ? "text-mrgn-green" : "text-mrgn-error"
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
          </PopoverContent>
        </Popover>
      </Desktop>
      <Mobile>
        <Drawer open={open} onOpenChange={(open) => setOpen(open)}>
          <DrawerTrigger asChild>
            <div>{children ? children : <TokenTrigger selected={selected} open={open} />}</div>
          </DrawerTrigger>
          <DrawerContent className="h-full z-[55] mt-0 p-2">
            <Command>
              <CommandInput placeholder="Select pool..." className="text-base" autoFocus={false} />
              <CommandList className="">
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
                      <div className="flex items-center gap-2 relative">
                        <Image
                          src={pool.tokenBank.meta.tokenLogoUri}
                          width={32}
                          height={32}
                          alt={pool.tokenBank.meta.tokenName}
                          className="rounded-full w-[32px] h-[32px] object-cover"
                        />
                        <Image
                          src={pool.quoteBank.meta.tokenLogoUri}
                          width={16}
                          height={16}
                          alt={pool.quoteBank.meta.tokenName}
                          className="rounded-full w-[16px] h-[16px] object-cover absolute -right-1 -bottom-1"
                        />
                      </div>
                      <span>{pool.tokenBank.meta.tokenSymbol}</span>
                      {pool.tokenBank.tokenData && (
                        <div className="flex items-center justify-between gap-1 text-sm ml-auto w-full text-muted-foreground max-w-[160px]">
                          <span>
                            {tokenPriceFormatter(pool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())}
                          </span>
                          <span
                            className={cn(
                              pool.tokenBank.tokenData?.priceChange24hr > 1 ? "text-mrgn-green" : "text-mrgn-error"
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
  selected: ArenaPoolV2Extended | null;
  open: boolean;
};

const TokenTrigger = ({ selected, open }: TokenTriggerProps) => {
  return (
    <div className="flex items-center px-2 py-1 justify-center font-medium text-base hover:bg-accent transition-colors cursor-pointer rounded-md  gap-2">
      <Image
        src={selected?.tokenBank.meta.tokenLogoUri ?? ""}
        alt={selected?.tokenBank.meta.tokenSymbol ?? ""}
        width={28}
        height={28}
        className="bg-background border rounded-full lg:mb-0 w-[28px] h-[28px] object-cover"
      />
      <h1 className="flex items-center gap-1 ">
        {selected?.tokenBank.meta.tokenSymbol}{" "}
        <IconChevronDown
          size={18}
          className={cn(open ? "rotate-180 transition-all duration-200" : "rotate-0 transition-all duration-200")}
        />
      </h1>
    </div>
  );
};
