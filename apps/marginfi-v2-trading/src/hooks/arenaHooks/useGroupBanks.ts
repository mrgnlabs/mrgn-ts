import React from "react";

import { GroupData } from "~/store/tradeStore";

export function useGroupBanks({ group }: { group: GroupData }) {
  const banks = React.useMemo(() => {
    const borrowBank =
      group.pool.token.isActive && group.pool.token.position.isLending ? group.pool.quoteTokens[0] : group.pool.token;
    const depositBank = group.pool.token.address.equals(borrowBank.address)
      ? group.pool.quoteTokens[0]
      : group.pool.token;
    const isBorrowing = borrowBank.isActive && !borrowBank.position.isLending;
    const isDepositing = depositBank.isActive && depositBank.position.isLending;

    return { borrowBank: isBorrowing ? borrowBank : null, depositBank: isDepositing ? depositBank : null };
  }, [group]);

  return {
    depositBank: banks.depositBank,
    borrowBank: banks.borrowBank,
  };
}
