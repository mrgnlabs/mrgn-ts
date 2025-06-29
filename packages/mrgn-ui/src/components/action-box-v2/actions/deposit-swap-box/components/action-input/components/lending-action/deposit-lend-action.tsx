import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { dynamicNumeralFormatter, WalletToken } from "@mrgnlabs/mrgn-common";
import { ActionInputTag } from "~/components/action-box-v2/components";

type DepositSwapActionProps = {
  walletAmount: number | undefined;
  maxAmount: number;
  showLendingHeader?: boolean;
  lendMode: ActionType;
  selectedBank: ExtendedBankInfo | WalletToken | null;

  onSetAmountRaw: (amount: string) => void;
};

export const DepositSwapAction = ({
  maxAmount,
  walletAmount,
  onSetAmountRaw,
  selectedBank,
  lendMode,
}: DepositSwapActionProps) => {
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

    if ("info" in selectedBank) {
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
    } else {
      return {
        label: "Wallet: ",
        amount: formatAmount(walletAmount, selectedBank?.symbol),
      };
    }
  }, [selectedBank, lendMode, walletAmount]);

  // const isMaxButtonVisible = React.useMemo(() => lendMode === ActionType.Repay, [lendMode]);

  // Section above the input
  return (
    <>
      {selectedBank && (
        <ActionInputTag
          label={maxLabel.label}
          amount={maxLabel.amount}
          isDisabled={maxAmount === 0}
          handleOnClick={() => onSetAmountRaw(numberFormater.format(maxAmount))}
        />
      )}
    </>
  );
};
