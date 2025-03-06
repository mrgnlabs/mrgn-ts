import React from "react";

import { ArenaPoolSummary } from "~/types";

import { SearchList } from "./search-list";
import { Command, CommandDialog, CommandInput } from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";

type SearchPopoverProps = {
  pools: ArenaPoolSummary[];
  trigger?: React.ReactNode;
  filter?: (value: string, search: string) => number;
};

const SearchPopover = ({ pools, filter, trigger }: SearchPopoverProps) => {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger ? trigger : <Button variant="outline">Search</Button>}</PopoverTrigger>
      <PopoverContent>
        <Command filter={filter}>
          <CommandInput placeholder="Search pools..." autoFocus />
          <SearchList pools={pools} setOpen={setOpen} size="sm" />
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export { SearchPopover };
