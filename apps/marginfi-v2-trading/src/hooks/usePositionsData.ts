import React from "react";
import { PublicKey } from "@solana/web3.js";

import { useTradeStoreV2 } from "~/store";

type UsePositionsDataProps = {
  groupPk: PublicKey;
};

export function usePositionsData({ groupPk }: UsePositionsDataProps) {
  const [positionsByGroupPk] = useTradeStoreV2((state) => [state.positionsByGroupPk]);

  const positions = React.useMemo(() => {
    return positionsByGroupPk[groupPk.toBase58()];
  }, [positionsByGroupPk, groupPk]);

  return positions;
}
