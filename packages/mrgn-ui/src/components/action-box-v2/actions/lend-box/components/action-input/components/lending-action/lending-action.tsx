import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

type LendingActionProps = {
  walletAmount: number | undefined;
  maxAmount: number;
  showLendingHeader?: boolean;
  lendMode: ActionType;
  selectedBank: ExtendedBankInfo | null;
  disabled?: boolean;

  onSetAmountRaw: (amount: string) => void;
};

export const LendingAction = ({
  maxAmount,
  walletAmount,
  onSetAmountRaw,
  selectedBank,
  lendMode,
  disabled = false,
}: LendingActionProps) => {
  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const maxLabel = React.useMemo((): {
    amount: string;
    showWalletIcon?: boolean;
    label?: string;
  } => {
    if (!selectedBank) {
      return {
        amount: "-",
        showWalletIcon: false,
      };
    }

    const formatAmount = (amount?: number, symbol?: string) =>
      amount !== undefined ? `${dynamicNumeralFormatter(amount)} ${symbol}` : "-";

    switch (lendMode) {
      case ActionType.Deposit:
        return {
          label: "Wallet: ",
          amount: formatAmount(walletAmount, selectedBank?.meta.tokenSymbol),
        };
      case ActionType.Borrow:
        return {
          label: "Max Borrow: ",
          amount: formatAmount(selectedBank.userInfo.maxBorrow, selectedBank?.meta.tokenSymbol),
        };

      case ActionType.Withdraw:
        return {
          amount: formatAmount(
            selectedBank?.isActive ? selectedBank.position.amount : undefined,
            selectedBank?.meta.tokenSymbol
          ),
          label: "Supplied: ",
        };

      case ActionType.Repay:
        return {
          amount: formatAmount(
            selectedBank?.isActive ? selectedBank.position.amount : undefined,
            selectedBank?.meta.tokenSymbol
          ),
          label: "Borrowed: ",
        };

      default:
        return { amount: "-" };
    }
  }, [selectedBank, lendMode, walletAmount]);

  // const isMaxButtonVisible = React.useMemo(() => lendMode === ActionType.Repay, [lendMode]);

  // Section above the input
  return (
    <>
      {selectedBank && (
        <ul className="flex flex-col gap-0.5 mt-4 text-xs w-full text-muted-foreground">
          <li className="flex justify-between items-center gap-1.5">
            <strong className="mr-auto">{maxLabel.label}</strong>
            <div className="flex space-x-1">
              {/* {selectedBank?.isActive && <div>{clampedNumeralFormatter(selectedBank.position.amount)}</div>}
              {selectedBank?.isActive && <IconArrowRight width={12} height={12} />} */}
              <div>{maxLabel.amount}</div>

              <button
                className="cursor-pointer border-b border-transparent transition text-mfi-action-box-highlight hover:border-mfi-action-box-highlight disabled:opacity-50 disabled:cursor-default disabled:hover:border-transparent"
                disabled={maxAmount === 0 || disabled}
                onClick={() => onSetAmountRaw(numberFormater.format(maxAmount))}
              >
                MAX
              </button>
            </div>
          </li>
        </ul>
      )}
    </>
  );
};
