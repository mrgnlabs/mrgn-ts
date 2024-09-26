import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { clampedNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { useLendBoxStore } from "~/components/actionbox-v2/actions/lend-box/store";

type LendingActionProps = {
  walletAmount: number | undefined;
  maxAmount: number;
  showLendingHeader?: boolean;

  onSetAmountRaw: (amount: string) => void;
};

export const LendingAction = ({ maxAmount, walletAmount, onSetAmountRaw }: LendingActionProps) => {
  const [lendMode, selectedBank] = useLendBoxStore((state) => [state.lendMode, state.selectedBank]);

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
      amount !== undefined ? `${clampedNumeralFormatter(amount)} ${symbol}` : "-";

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
                className="cursor-pointer text-chartreuse border-b border-transparent transition hover:border-chartreuse"
                disabled={maxAmount === 0}
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
