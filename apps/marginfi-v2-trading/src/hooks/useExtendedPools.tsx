import React from "react";
import { useTradeStoreV2 } from "~/store";
import { ArenaPoolV2, ArenaPoolV2Extended } from "~/types/trade-store.types";
import { getPoolPositionStatus } from "~/utils";

export function useExtendedPool(pool: ArenaPoolV2) {
  const [banksByBankPk] = useTradeStoreV2((state) => [state.banksByBankPk]);

  const extendedPool = React.useMemo(() => {
    const tokenBank = banksByBankPk[pool.tokenBankPk.toBase58()];
    const quoteBank = banksByBankPk[pool.quoteBankPk.toBase58()];
    const status = getPoolPositionStatus(pool, tokenBank, quoteBank);

    return {
      groupPk: pool.groupPk,
      status,
      tokenBank,
      quoteBank,
    } as ArenaPoolV2Extended;
  }, [banksByBankPk, pool]);

  return extendedPool;
}

export function useExtendedPools() {
  const [arenaPools, banksByBankPk] = useTradeStoreV2((state) => [state.arenaPools, state.banksByBankPk]);

  const extendedPools = React.useMemo(
    () =>
      Object.values(arenaPools).map((pool) => {
        const tokenBank = banksByBankPk[pool.tokenBankPk.toBase58()];
        const quoteBank = banksByBankPk[pool.quoteBankPk.toBase58()];

        return {
          groupPk: pool.groupPk,
          status: getPoolPositionStatus(pool, tokenBank, quoteBank),
          tokenBank: tokenBank,
          quoteBank: quoteBank,
        };
      }) as ArenaPoolV2Extended[],
    [arenaPools, banksByBankPk]
  );

  return extendedPools;
}
