import { IconCommand } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";

import React from "react";

import { IconSearch } from "@tabler/icons-react";
import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";
import { useIsMobile } from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2 } from "~/store";
import { filter } from "./utils/search.utils";

import { SearchDialog, SearchDrawer } from "./components";
import { Input } from "~/components/ui/input";

const SearchInput = () => {
  const [open, setOpen] = React.useState(false);
  const [arenaPoolsSummary] = useTradeStoreV2((state) => [state.arenaPoolsSummary]);
  const pools = React.useMemo(() => Object.values(arenaPoolsSummary), [arenaPoolsSummary]);
  const isMobile = useIsMobile();

  const trigger = (
    <div
      className="relative group border border-muted-foreground/25 rounded-full pl-9 pr-2 transition-colors w-full cursor-pointer hover:bg-muted"
      onClick={() => setOpen(true)}
    >
      <IconSearch size={18} className="absolute left-[18px] top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={isMobile ? "Search pools..." : "Search tokens by name, symbol, or mint address..."}
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
        <SearchDrawer
          trigger={<div className="px-8 w-full">{trigger}</div>}
          pools={pools}
          filter={(value, search) => filter(value, search, pools)}
        />
      </Mobile>
    </>
  );
};

export { SearchInput };
