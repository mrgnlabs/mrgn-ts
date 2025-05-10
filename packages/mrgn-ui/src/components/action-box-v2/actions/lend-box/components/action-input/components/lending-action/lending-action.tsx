import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { ActionInputTag } from "~/components/action-box-v2/components";

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
        if (selectedBank.info.rawBank.config.assetTag === 2) {
          return {
            label: "Stake Account: ",
            amount: formatAmount(walletAmount, "SOL"),
          };
        }
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

  return (
    <>
      {selectedBank && (
        <ActionInputTag
          label={maxLabel.label}
          amount={maxLabel.amount}
          isDisabled={maxAmount === 0 || disabled}
          handleOnClick={() => onSetAmountRaw(numberFormater.format(maxAmount))}
        />
      )}
    </>
  );
};
