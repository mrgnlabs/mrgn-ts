import React from "react";

import { IconCommand, IconSearch } from "@tabler/icons-react";

import { useTradeStoreV2 } from "~/store";

import { SearchDialog } from "./components";
import { Input } from "~/components/ui/input";

const SearchButton = () => {
  const [open, setOpen] = React.useState(false);
  const [arenaPoolsSummary] = useTradeStoreV2((state) => [state.arenaPoolsSummary]);
  return (
    <>
      <button className="group relative" onClick={() => setOpen(true)}>
        <Input placeholder="Search pools" className="pointer-events-none group-hover:bg-muted pl-8 min-w-64" />
        <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <span className="text-muted-foreground/75 text-xs absolute right-3 top-1/2 -translate-y-1/2">⌘ K</span>
      </button>
      <SearchDialog
        open={open}
        setOpen={setOpen}
        pools={Object.values(arenaPoolsSummary)}
        filter={(value, search) => Number(value.toLowerCase().includes(search.toLowerCase()))}
      />
    </>
  );
};

export { SearchButton };
