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

  const isDust = useMemo(() => bank.isActive && bank.position.isDust, [bank]);
  const showCloseBalance = useMemo(() => currentAction === ActionType.Withdraw && isDust, [isDust, currentAction]); // Only case we should show close balance is when we are withdrawing a dust balance, since user receives 0 tokens back (vs repaying a dust balance where the input box will show the smallest unit of the token)
  const isActionDisabled = useMemo(() => {
    const isValidInput = borrowOrLendAmount > 0;
    return (maxAmount === 0 || !isValidInput) && !showCloseBalance;
  }, [borrowOrLendAmount, showCloseBalance, maxAmount]);
  const isInputDisabled = useMemo(() => maxAmount === 0 && !showCloseBalance, [maxAmount, showCloseBalance]);

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
          disabled={isInputDisabled}
          onEnter={() => onBorrowOrLend(borrowOrLendAmount)}
        />
        <AssetRowAction
          bgColor={
            currentAction === ActionType.Deposit || currentAction === ActionType.Borrow
              ? "rgb(227, 227, 227)"
              : "rgba(0,0,0,0)"
          }
          onClick={() => (showCloseBalance ? onCloseBalance() : onBorrowOrLend(borrowOrLendAmount))}
          disabled={isActionDisabled}
        >
          {showCloseBalance ? "Close" : currentAction}
        </AssetRowAction>
      </div>
    </>
  );
};
