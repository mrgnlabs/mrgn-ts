import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";

export function useLendAmounts({
  amountRaw,
  selectedBank,
  nativeSolBalance,
  lendMode,
}: {
  amountRaw: string;
  nativeSolBalance: number;
  lendMode: ActionType;
  selectedBank: ExtendedBankInfo | null;
}) {
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

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

    switch (lendMode) {
      case ActionType.Deposit:
        return selectedBank?.userInfo.maxDeposit ?? 0;
      case ActionType.Withdraw:
        return selectedBank?.userInfo.maxWithdraw ?? 0;
      case ActionType.Borrow:
        return selectedBank?.userInfo.maxBorrow ?? 0;
      case ActionType.Repay:
        return selectedBank?.userInfo.maxRepay ?? 0;
      default:
        return 0;
    }
  }, [selectedBank, lendMode]);

  return {
    amount,
    walletAmount,
    maxAmount,
  };
}
