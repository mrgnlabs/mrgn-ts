import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { clampedNumeralFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { useFlashLoanBoxStore } from "../../../store";

type props = {
  walletAmount: number | undefined;
  maxAmount: number;
  showLendingHeader?: boolean;

  onSetAmountRaw: (amount: string) => void;
};

export const FlashLoanAction = ({ maxAmount, walletAmount, onSetAmountRaw }: props) => {
  const [actionMode, amountRaw, selectedBank, selectedSecondaryBank] = useFlashLoanBoxStore((state) => [
    state.actionMode,
    state.amountRaw,
    state.selectedBank,
    state.selectedSecondaryBank,
  ]);

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

    switch (actionMode) {
      case ActionType.Loop:
        return {
          label: "Wallet: ",
          amount: formatAmount(walletAmount, selectedBank?.meta.tokenSymbol),
        };

      case ActionType.RepayCollat:
        const strippedAmount = amountRaw.replace(/,/g, "");

        const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

        const amountLeft = numeralFormatter(selectedBank?.isActive ? selectedBank.position.amount - amount : 0);
        return {
          amount: `${amountLeft} ${selectedBank?.meta.tokenSymbol}`,
          label: "Borrowed: ",
        };

      default:
        return { amount: "-" };
    }
  }, [selectedBank, actionMode, walletAmount]);

  const isMaxButtonVisible = React.useMemo(
    () => actionMode === ActionType.Loop || (actionMode === ActionType.RepayCollat && selectedSecondaryBank),
    [actionMode, selectedSecondaryBank]
  );

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
