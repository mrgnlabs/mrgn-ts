import React from "react";

import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2 } from "~/store";
import { filter } from "./utils/search.utils";

import { SearchPopover as SearchPopoverComponent, SearchDrawer } from "./components";

type SearchPopoverProps = {
  trigger: React.ReactNode;
};

const SearchPopover = ({ trigger }: SearchPopoverProps) => {
  const [arenaPoolsSummary] = useTradeStoreV2((state) => [state.arenaPoolsSummary]);
  const pools = React.useMemo(() => Object.values(arenaPoolsSummary), [arenaPoolsSummary]);
  return (
    <>
      <Desktop>
        <SearchPopoverComponent
          trigger={trigger}
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

export { SearchPopover };
