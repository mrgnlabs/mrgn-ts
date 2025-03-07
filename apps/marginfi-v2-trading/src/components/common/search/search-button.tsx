import React from "react";

import { IconSearch } from "@tabler/icons-react";
import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2 } from "~/store";
import { filter } from "./utils/search.utils";

import { SearchDialog, SearchDrawer } from "./components";
import { Input } from "~/components/ui/input";

const SearchButton = () => {
  const [open, setOpen] = React.useState(false);
  const [arenaPoolsSummary] = useTradeStoreV2((state) => [state.arenaPoolsSummary]);
  const pools = React.useMemo(() => Object.values(arenaPoolsSummary), [arenaPoolsSummary]);

  const trigger = (
    <button className="group relative" onClick={() => setOpen(true)}>
      <Input placeholder="Search pools" className="pointer-events-none group-hover:bg-muted pl-8 min-w-64" />
      <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <span className="text-muted-foreground/75 text-xs absolute right-3 top-1/2 -translate-y-1/2">⌘ K</span>
    </button>
  );

  return (
    <>
      <Desktop>
        {trigger}
        <SearchDialog
          open={open}
          setOpen={setOpen}
          pools={pools}
          filter={(value, search) => filter(value, search, pools)}
        />
      </Desktop>
      <Mobile>
        <SearchDrawer trigger={trigger} pools={pools} filter={(value, search) => filter(value, search, pools)} />
      </Mobile>
    </>
  );
};

export { SearchButton };
