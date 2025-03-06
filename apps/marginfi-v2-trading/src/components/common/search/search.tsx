import React from "react";

import { IconCommand, IconSearch, IconX } from "@tabler/icons-react";

import { useTradeStoreV2 } from "~/store";

import { SearchDialog } from "./components";
import { Input } from "~/components/ui/input";
import { cn } from "~/theme";
import { Button } from "~/components/ui/button";

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

const SearchInput = () => {
  const [open, setOpen] = React.useState(false);
  const [arenaPoolsSummary] = useTradeStoreV2((state) => [state.arenaPoolsSummary]);
  return (
    <>
      <div
        className="relative group border border-muted-foreground/25 rounded-full pl-9 pr-2 transition-colors w-full cursor-pointer hover:bg-muted"
        onClick={() => setOpen(true)}
      >
        <IconSearch size={18} className="absolute left-[18px] top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={"Search tokens by name, symbol, or mint address..."}
          className="py-2 h-auto bg-transparent outline-none focus-visible:ring-0 md:text-lg md:py-3 border-none pointer-events-none"
        />

        <Button
          size="sm"
          variant="outline"
          className="absolute text-[10px] right-6 top-1/2 -translate-y-1/2 gap-0.5 px-1.5 py-0.5 h-auto text-muted-foreground md:right-4 md:text-xs"
        >
          <IconCommand size={14} />K
        </Button>
      </div>
      <SearchDialog
        open={open}
        setOpen={setOpen}
        pools={Object.values(arenaPoolsSummary)}
        filter={(value, search) => Number(value.toLowerCase().includes(search.toLowerCase()))}
      />
    </>
  );
};

export { SearchButton, SearchInput };
