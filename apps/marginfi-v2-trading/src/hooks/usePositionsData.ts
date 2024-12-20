import React from "react";
import { PublicKey } from "@solana/web3.js";

import { useTradeStoreV2 } from "~/store";
import { ArenaPoolPositions } from "~/types/trade-store.types";

type UsePositionsDataProps = {
  groupPk?: PublicKey;
};

export function usePositionsData({ groupPk }: UsePositionsDataProps) {
  const [positionsByGroupPk] = useTradeStoreV2((state) => [state.positionsByGroupPk]);

  const positions = React.useMemo(() => {
    if (!groupPk) return {} as ArenaPoolPositions;
    return positionsByGroupPk[groupPk.toBase58()] ?? ({} as ArenaPoolPositions);
  }, [positionsByGroupPk, groupPk]);

  return positions;
}
