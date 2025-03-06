import React from "react";

import { useTradeStoreV2 } from "~/store";
import { filter } from "./utils/search.utils";

import { SearchPopover as SearchPopoverComponent } from "./components/search-popover";

type SearchPopoverProps = {
  trigger: React.ReactNode;
};

const SearchPopover = ({ trigger }: SearchPopoverProps) => {
  const [arenaPoolsSummary] = useTradeStoreV2((state) => [state.arenaPoolsSummary]);
  const pools = React.useMemo(() => Object.values(arenaPoolsSummary), [arenaPoolsSummary]);
  return (
    <SearchPopoverComponent trigger={trigger} pools={pools} filter={(value, search) => filter(value, search, pools)} />
  );
};

export { SearchPopover };
