import React, { FC, useMemo, useState } from "react";
import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { uiToNative } from "@mrgnlabs/mrgn-common";
import { AssetRowAction, AssetRowInputBox } from "~/components/common/AssetList";

export const AssetCardActions: FC<{
  bank: ExtendedBankInfo;
  isBankFilled: boolean;
  isInLendingMode: boolean;
  currentAction: ActionType;
  inputRefs?: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  onCloseBalance: () => void;
  onBorrowOrLend: (amount: number) => void;
}> = ({ bank, inputRefs, currentAction, onCloseBalance, onBorrowOrLend }) => {
  const [borrowOrLendAmount, setBorrowOrLendAmount] = useState<number>(0);

  const maxAmount = useMemo(() => {
    switch (currentAction) {
      case ActionType.Deposit:
        return bank.userInfo.maxDeposit;
      case ActionType.Withdraw:
        return bank.userInfo.maxWithdraw;
      case ActionType.Borrow:
        return bank.userInfo.maxBorrow;
      case ActionType.Repay:
        return bank.userInfo.maxRepay;
    }
  }, [bank.userInfo, currentAction]);

  const isDust = useMemo(
    () => bank.isActive && uiToNative(bank.position.amount, bank.info.state.mintDecimals).isZero(),
    [bank]
  );

  const isDisabled = useMemo(
    () =>
      (isDust &&
        uiToNative(bank.userInfo.tokenAccount.balance, bank.info.state.mintDecimals).isZero() &&
        currentAction == ActionType.Borrow) ||
      (!isDust && maxAmount === 0),
    [currentAction, bank, isDust, maxAmount]
  );

  return (
    <>
      <div className="flex flex-row gap-[10px] justify-between w-full">
        <AssetRowInputBox
          tokenName={bank.meta.tokenSymbol}
          value={borrowOrLendAmount}
          setValue={setBorrowOrLendAmount}
          maxValue={maxAmount}
          maxDecimals={bank.info.state.mintDecimals}
          inputRefs={inputRefs}
          disabled={isDust || maxAmount === 0}
          onEnter={() => onBorrowOrLend(borrowOrLendAmount)}
        />
        <AssetRowAction
          bgColor={
            currentAction === ActionType.Deposit || currentAction === ActionType.Borrow
              ? "rgb(227, 227, 227)"
              : "rgba(0,0,0,0)"
          }
          onClick={() => (isDust ? onCloseBalance() : onBorrowOrLend(borrowOrLendAmount))}
          disabled={isDisabled}
        >
          {isDust ? "Close" : currentAction}
        </AssetRowAction>
      </div>
    </>
  );
};
