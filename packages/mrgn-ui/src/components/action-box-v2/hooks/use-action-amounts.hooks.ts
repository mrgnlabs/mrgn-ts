import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { PublicKey } from "@solana/web3.js";

type UseActionAmountsProps = {
  amountRaw: string;
  nativeSolBalance: number;
  actionMode: ActionType;
  selectedBank: ExtendedBankInfo | null;
  maxAmountCollateral?: number;
  selectedStakeAccount?: { address: PublicKey; balance: number };
};

export function useActionAmounts({
  amountRaw,
  selectedBank,
  nativeSolBalance,
  actionMode,
  maxAmountCollateral,
  selectedStakeAccount,
}: UseActionAmountsProps) {
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const debouncedAmount = useAmountDebounce<number | null>(amount, 500);

  const walletAmount = React.useMemo(() => {
    if (!selectedBank) {
      return 0;
    }

    if (selectedBank.info.rawBank.config.assetTag === 2) {
      return selectedStakeAccount?.balance ?? 0;
    }

    if (selectedBank?.info.state.mint?.equals(WSOL_MINT)) {
      return selectedBank?.userInfo.tokenAccount.balance + nativeSolBalance;
    }

    return selectedBank?.userInfo.tokenAccount.balance;
  }, [nativeSolBalance, selectedBank, selectedStakeAccount]);

  const maxAmount = React.useMemo(() => {
    if (!selectedBank) {
      return 0;
    }

    switch (actionMode) {
      case ActionType.Deposit:
        return selectedBank.info.rawBank.config.assetTag === 2
          ? (selectedStakeAccount?.balance ?? 0)
          : (selectedBank?.userInfo.maxDeposit ?? 0);
      case ActionType.Withdraw:
        return selectedBank?.userInfo.maxWithdraw ?? 0;
      case ActionType.Borrow:
        return selectedBank?.userInfo.maxBorrow ?? 0;
      case ActionType.Repay:
        return selectedBank?.userInfo.maxRepay ?? 0;
      case ActionType.RepayCollat:
        return maxAmountCollateral ?? 0;
      case ActionType.Loop:
        return selectedBank?.userInfo.maxDeposit ?? 0;
      case ActionType.MintLST:
        return selectedBank?.userInfo.maxDeposit ?? 0;
      case ActionType.UnstakeLST:
        return selectedBank?.userInfo.maxDeposit ?? 0;
      case ActionType.UnstakeFull:
        return selectedBank?.userInfo.maxDeposit ?? 0;
      default:
        return 0;
    }
  }, [selectedBank, actionMode, maxAmountCollateral, selectedStakeAccount]);

  return {
    amount,
    debouncedAmount,
    walletAmount,
    maxAmount,
  };
}
