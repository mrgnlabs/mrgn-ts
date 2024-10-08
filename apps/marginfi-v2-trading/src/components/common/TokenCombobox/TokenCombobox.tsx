import React from "react";

import Image from "next/image";
import { IconChevronDown } from "@tabler/icons-react";

import { percentFormatter, tokenPriceFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { Desktop, Mobile, cn } from "@mrgnlabs/mrgn-utils";

import { useTradeStore } from "~/store";

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

type TokenComboboxProps = {
  selected: GroupData | null;
  setSelected: (groupData: GroupData) => void;
  children?: React.ReactNode;
};

export const TokenCombobox = ({ selected, setSelected, children }: TokenComboboxProps) => {
  const [open, setOpen] = React.useState(false);
  const [groupMap] = useTradeStore((state) => [state.groupMap]);
  const groups = Array.from(groupMap.values()).sort((a, b) => {
    return a.pool.poolData && b.pool.poolData ? b.pool.poolData.totalLiquidity - a.pool.poolData.totalLiquidity : 0;
  });

  return (
    <>
      <Desktop>
        <Dialog open={open} onOpenChange={(open) => setOpen(open)}>
          <DialogTrigger asChild>
            <div>{children ? children : <TokenTrigger selected={selected} />}</div>
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
                    {groups.map((group, index) => (
                      <CommandItem
                        key={index}
                        className="gap-3 py-2 cursor-pointer rounded-md aria-selected:text-primary"
                        value={group.client.group.address.toBase58().toLowerCase()}
                        onSelect={(value) => {
                          const selBank = groups.find(
                            (group) => group.client.group.address.toBase58().toLowerCase() === value
                          );
                          if (!selBank) return;
                          setSelected(selBank);
                          setOpen(false);
                        }}
                      >
                        <Image
                          src={group.pool.token.meta.tokenLogoUri}
                          width={32}
                          height={32}
                          alt={group.pool.token.meta.tokenName}
                          className="rounded-full"
                        />
                        <span>{group.pool.token.meta.tokenSymbol}</span>
                        {group.pool.token.tokenData && (
                          <div className="flex items-center justify-between gap-1 w-[40%] text-xs ml-auto text-muted-foreground">
                            <span>
                              {tokenPriceFormatter(group.pool.token.info.oraclePrice.priceRealtime.price.toNumber())}
                            </span>
                            <span
                              className={cn(
                                group.pool.token.tokenData?.priceChange24hr > 1
                                  ? "text-mrgn-success"
                                  : "text-mrgn-error"
                              )}
                            >
                              {group.pool.token.tokenData?.priceChange24hr > 1 ? "+" : ""}
                              {percentFormatter.format(group.pool.token.tokenData?.priceChange24hr / 100)}
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
            <div>{children ? children : <TokenTrigger selected={selected} />}</div>
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
                  {groups.map((group, index) => (
                    <CommandItem
                      key={index}
                      className="gap-3 py-2 cursor-pointer rounded-md aria-selected:text-primary"
                      value={group.client.group.address.toBase58().toLowerCase()}
                      onSelect={(value) => {
                        const selBank = groups.find(
                          (group) => group.client.group.address.toBase58().toLowerCase() === value
                        );
                        if (!selBank) return;
                        setSelected(selBank);
                        setOpen(false);
                      }}
                    >
                      <Image
                        src={group.pool.token.meta.tokenLogoUri}
                        width={32}
                        height={32}
                        alt={group.pool.token.meta.tokenName}
                        className="rounded-full"
                      />
                      <span>{group.pool.token.meta.tokenSymbol}</span>
                      {group.pool.token.tokenData && (
                        <div className="flex items-center justify-between gap-1 text-sm ml-auto w-full text-muted-foreground max-w-[160px]">
                          <span>
                            {tokenPriceFormatter(group.pool.token.info.oraclePrice.priceRealtime.price.toNumber())}
                          </span>
                          <span
                            className={cn(
                              "text-xs",
                              group.pool.token.tokenData?.priceChange24hr > 1 ? "text-mrgn-success" : "text-mrgn-error"
                            )}
                          >
                            {percentFormatter.format(group.pool.token.tokenData?.priceChange24hr / 100)}
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

const TokenTrigger = ({ selected }: { selected: GroupData | null }) => {
  return (
    <Button variant="secondary" size="lg" className="relative w-full justify-start pr-8 pl-3 py-3">
      {selected !== null ? (
        <>
          <Image
            src={selected.pool.token.meta.tokenLogoUri}
            width={24}
            height={24}
            alt={`Pool ${selected}`}
            className="rounded-full"
          />{" "}
          {selected.pool.token.meta.tokenSymbol}
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
