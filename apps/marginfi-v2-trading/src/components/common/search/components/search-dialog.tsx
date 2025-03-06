import React from "react";

import { ArenaPoolSummary } from "~/types";

import { SearchList } from "./";
import { CommandDialog, CommandInput } from "~/components/ui/command";

type SearchDialogProps = {
  open: boolean;
  pools: ArenaPoolSummary[];
  setOpen: (open: boolean) => void;
  filter?: (value: string, search: string) => number;
};

const SearchDialog = ({ open, setOpen, pools, filter }: SearchDialogProps) => {
  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      commandProps={{
        filter,
      }}
    >
      <CommandInput placeholder="Search pools by token or mint address..." autoFocus />
      <SearchList pools={pools} setOpen={setOpen} />
    </CommandDialog>
  );
};

export { SearchDialog };
