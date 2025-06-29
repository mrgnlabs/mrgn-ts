import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { WalletToken, WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";

export function useDepositSwapActionAmounts({
  amountRaw,
  selectedBank,
  nativeSolBalance,
  actionMode,
  maxAmountCollateral,
  walletTokens,
}: {
  amountRaw: string;
  nativeSolBalance: number;
  actionMode: ActionType;
  selectedBank: ExtendedBankInfo | WalletToken | null;
  maxAmountCollateral?: number;
  walletTokens: WalletToken[] | null;
}) {
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);

  const walletAmount = React.useMemo(() => {
    if (!selectedBank) return 0;

    if ("info" in selectedBank) {
      // Case: ExtendedBankInfo
      return selectedBank.info.state.mint?.equals(WSOL_MINT)
        ? selectedBank.userInfo.tokenAccount.balance + nativeSolBalance
        : selectedBank.userInfo.tokenAccount.balance;
    } else {
      // Case: WalletToken
      return selectedBank.symbol === "SOL" ? selectedBank.balance + nativeSolBalance : selectedBank.balance;
    }
  }, [nativeSolBalance, selectedBank]);

  const maxAmount = React.useMemo(() => {
    if (!selectedBank) {
      return 0;
    }

    if ("info" in selectedBank) {
      switch (actionMode) {
        case ActionType.Deposit:
          return selectedBank.userInfo.maxDeposit ?? 0;
        case ActionType.Withdraw:
          return selectedBank.userInfo.maxWithdraw ?? 0;
        case ActionType.Borrow:
          return selectedBank.userInfo.maxBorrow ?? 0;
        case ActionType.Repay:
          return selectedBank.userInfo.maxRepay ?? 0;
        case ActionType.Loop:
          return selectedBank.userInfo.maxDeposit ?? 0;
        case ActionType.RepayCollat:
          return maxAmountCollateral ?? 0;
        case ActionType.MintLST:
          return selectedBank.userInfo.maxDeposit ?? 0;
        case ActionType.InstantUnstakeLST:
          return selectedBank.userInfo.maxDeposit ?? 0;
        default:
          return 0;
      }
    } else {
      return selectedBank.balance;
    }
  }, [selectedBank, actionMode, maxAmountCollateral]);

  return {
    amount,
    debouncedAmount,
    walletAmount,
    maxAmount,
  };
}
