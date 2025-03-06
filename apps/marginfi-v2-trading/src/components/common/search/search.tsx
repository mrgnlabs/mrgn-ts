import React from "react";

import { useTradeStoreV2 } from "~/store";
import { SearchButton, SearchDialog } from "./components";

const Search = () => {
  const [open, setOpen] = React.useState(false);
  const [arenaPoolsSummary] = useTradeStoreV2((state) => [state.arenaPoolsSummary]);
  return (
    <>
      <SearchButton onClick={() => setOpen(true)} />
      <SearchDialog
        open={open}
        setOpen={setOpen}
        pools={Object.values(arenaPoolsSummary)}
        filter={(value, search) => Number(value.toLowerCase().includes(search.toLowerCase()))}
      />
    </>
  );
};

export { Search };
