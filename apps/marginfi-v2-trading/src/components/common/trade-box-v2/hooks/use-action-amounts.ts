import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { ArenaBank, ArenaPoolV2Extended } from "~/types/trade-store.types";

export function useActionAmounts({
  amountRaw,
  activePool,
  collateralBank,
  nativeSolBalance,
}: {
  amountRaw: string;
  activePool: ArenaPoolV2Extended | null;
  collateralBank: ArenaBank | null;
  nativeSolBalance: number;
}) {
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);

  const walletAmount = React.useMemo(
    () =>
      collateralBank?.info.state.mint?.equals && collateralBank?.info.state.mint?.equals(WSOL_MINT)
        ? collateralBank?.userInfo.tokenAccount.balance + nativeSolBalance
        : collateralBank?.userInfo.tokenAccount.balance,
    [nativeSolBalance, collateralBank]
  );

  const maxAmount = React.useMemo(() => {
    if (!collateralBank) {
      return 0;
    }

    return collateralBank.userInfo.maxDeposit;
  }, [collateralBank]);

  return {
    amount,
    debouncedAmount,
    walletAmount,
    maxAmount,
  };
}
