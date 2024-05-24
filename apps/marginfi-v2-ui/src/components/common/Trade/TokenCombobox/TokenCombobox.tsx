"use client";

import React from "react";

import Image from "next/image";

import { IconChevronDown, IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import random from "lodash/random";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Button } from "~/components/ui/button";

type TokenComboboxProps = {
  selected: number | null;
  setSelected: (value: number) => void;
};

export const TokenCombobox = ({ selected, setSelected }: TokenComboboxProps) => {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="lg" className="w-full justify-start pr-4 pl-3 py-3">
          {selected !== null ? (
            <>
              <Image
                src={`https://picsum.photos/24?q=${random(0, 1000)}`}
                width={24}
                height={24}
                alt={`Pool ${selected}`}
                className="rounded-full"
              />{" "}
              Pool {selected + 1}
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
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {[...new Array(25)].map((_, index) => (
                <CommandItem
                  key={index}
                  className="gap-3 py-2 cursor-pointer rounded-md"
                  value={index.toString()}
                  onSelect={(value) => {
                    setSelected(Number(value));
                    setOpen(false);
                  }}
                >
                  <Image
                    src={`https://picsum.photos/32?q=${random(0, 1000)}`}
                    width={32}
                    height={32}
                    alt={`Pool ${index}`}
                    className="rounded-full"
                  />
                  <span>Pool {index + 1}</span>
                  {random(0, 1) ? (
                    <div className="ml-auto flex items-center gap-1 text-xs text-success">
                      +{random(0, 100)}% <IconTrendingUp size={16} />
                    </div>
                  ) : (
                    <div className="ml-auto flex items-center gap-1 text-xs text-error">
                      -{random(0, 100)}% <IconTrendingDown size={16} />
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
