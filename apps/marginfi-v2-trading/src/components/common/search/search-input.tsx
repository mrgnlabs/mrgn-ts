import React from "react";

import { IconCommand, IconSearch } from "@tabler/icons-react";
import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2 } from "~/store";
import { filter } from "./utils/search.utils";

import { SearchDialog, SearchDrawer } from "./components";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

const SearchInput = () => {
  const [open, setOpen] = React.useState(false);
  const [arenaPoolsSummary] = useTradeStoreV2((state) => [state.arenaPoolsSummary]);
  const pools = React.useMemo(() => Object.values(arenaPoolsSummary), [arenaPoolsSummary]);

  const trigger = (
    <div
      className="relative group border border-muted-foreground/25 rounded-full pl-9 pr-2 transition-colors w-full cursor-pointer hover:bg-muted"
      onClick={() => setOpen(true)}
    >
      <IconSearch size={18} className="absolute left-[18px] top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={"Search tokens by name, symbol, or mint address..."}
        className="py-2 h-auto bg-transparent outline-none focus-visible:ring-0 md:text-lg md:py-3 border-none pointer-events-none"
      />
    </div>
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

export { SearchInput };
