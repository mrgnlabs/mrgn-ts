import React from "react";

import { ArenaPoolSummary } from "~/types";

import { SearchList } from "./";
import { Command, CommandInput } from "~/components/ui/command";
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";

type SearchDrawerProps = {
  pools: ArenaPoolSummary[];
  trigger: React.ReactNode;
  filter: (value: string, search: string) => number;
};

const SearchDrawer = ({ pools, filter, trigger }: SearchDrawerProps) => {
  const [open, setOpen] = React.useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <div className="px-4 py-6">
          <Command filter={filter}>
            <CommandInput placeholder="Search pools by token or mint address..." autoFocus />
            <SearchList pools={pools} setOpen={setOpen} />
          </Command>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export { SearchDrawer };
