import React from "react";

import { useTradeStoreV2 } from "~/store";

import { SearchPopover as SearchPopoverComponent } from "./components/search-popover";

type SearchPopoverProps = {
  trigger: React.ReactNode;
};

const SearchPopover = ({ trigger }: SearchPopoverProps) => {
  const [arenaPoolsSummary] = useTradeStoreV2((state) => [state.arenaPoolsSummary]);
  return <SearchPopoverComponent trigger={trigger} pools={Object.values(arenaPoolsSummary)} />;
};

export { SearchPopover };
