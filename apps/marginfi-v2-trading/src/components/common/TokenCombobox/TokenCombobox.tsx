"use client";

import React from "react";

import Image from "next/image";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconChevronDown } from "@tabler/icons-react";

import { useTradeStore } from "~/store";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Button } from "~/components/ui/button";
import { getTokenImageURL } from "~/utils";

type TokenComboboxProps = {
  selected: ExtendedBankInfo | null;
  setSelected: (bank: ExtendedBankInfo) => void;
};

export const TokenCombobox = ({ selected, setSelected }: TokenComboboxProps) => {
  const [open, setOpen] = React.useState(false);
  const [extendedBankInfos] = useTradeStore((state) => [state.banks]);

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
              {extendedBankInfos.map((bank, index) => (
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
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
