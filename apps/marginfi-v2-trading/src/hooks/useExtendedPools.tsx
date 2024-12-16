import React from "react";
import { useTradeStoreV2 } from "~/store";
import { ArenaPoolV2, ArenaPoolV2Extended, ArenaBank, GroupStatus } from "~/types/trade-store.types";

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

function getPoolPositionStatus(pool: ArenaPoolV2, tokenBank: ArenaBank, quoteBank: ArenaBank): GroupStatus {
  let isLpPosition = true;
  let hasAnyPosition = false;
  let isLendingInAny = false;
  let isLong = false;
  let isShort = false;

  if (tokenBank.isActive && tokenBank.position) {
    hasAnyPosition = true;
    if (tokenBank.position.isLending) {
      isLendingInAny = true;
    } else if (tokenBank.position.usdValue > 0) {
      isShort = true;
      isLpPosition = false;
    }
  }

  if (quoteBank.isActive && quoteBank.position) {
    hasAnyPosition = true;
    if (quoteBank.position.isLending) {
      isLendingInAny = true;
    } else if (quoteBank.position.usdValue > 0) {
      if (tokenBank.isActive && tokenBank.position && tokenBank.position.isLending) {
        isLong = true;
      }
      isLpPosition = false;
    }
  }

  let status = GroupStatus.EMPTY;

  if (hasAnyPosition) {
    if (isLpPosition && isLendingInAny) {
      status = GroupStatus.LP;
    } else if (isLong) {
      status = GroupStatus.LONG;
    } else if (isShort) {
      status = GroupStatus.SHORT;
    }
  }

  return status;
}
