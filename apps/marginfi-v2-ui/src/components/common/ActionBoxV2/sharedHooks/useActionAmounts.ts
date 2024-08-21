import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { useAmountDebounce } from "~/hooks/useAmountDebounce";

export function useActionAmounts({
  amountRaw,
  selectedBank,
  nativeSolBalance,
  actionMode,
  maxAmountCollat,
}: {
  amountRaw: string;
  nativeSolBalance: number;
  actionMode: ActionType;
  selectedBank: ExtendedBankInfo | null;
  maxAmountCollat?: number;
}) {
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);

  const walletAmount = React.useMemo(
    () =>
      selectedBank?.info.state.mint?.equals && selectedBank?.info.state.mint?.equals(WSOL_MINT)
        ? selectedBank?.userInfo.tokenAccount.balance + nativeSolBalance
        : selectedBank?.userInfo.tokenAccount.balance,
    [nativeSolBalance, selectedBank]
  );

  const maxAmount = React.useMemo(() => {
    if (!selectedBank) {
      return 0;
    }

    switch (actionMode) {
      case ActionType.Deposit:
        return selectedBank?.userInfo.maxDeposit ?? 0;
      case ActionType.Withdraw:
        return selectedBank?.userInfo.maxWithdraw ?? 0;
      case ActionType.Borrow:
        return selectedBank?.userInfo.maxBorrow ?? 0;
      case ActionType.Repay:
        return selectedBank?.userInfo.maxRepay ?? 0;
      case ActionType.Loop:
        return selectedBank?.userInfo.maxDeposit ?? 0;
      case ActionType.RepayCollat:
        return maxAmountCollat ?? 0;
      default:
        return 0;
    }
  }, [selectedBank, actionMode]);

  return {
    amount,
    debouncedAmount,
    walletAmount,
    maxAmount,
  };
}
