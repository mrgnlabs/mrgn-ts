import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { clampedNumeralFormatter } from "@mrgnlabs/mrgn-common";

type StakingActionProps = {
  walletAmount: number | undefined;
  maxAmount: number;
  showStakingHeader?: boolean;
  actionMode: ActionType;
  selectedBank: ExtendedBankInfo | null;

  onSetAmountRaw: (amount: string) => void;
};

export const StakingAction = ({ maxAmount, walletAmount, onSetAmountRaw, selectedBank }: StakingActionProps) => {
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

    return {
      amount: formatAmount(walletAmount, selectedBank?.meta.tokenSymbol),
      label: "Wallet: ",
    };
  }, [selectedBank, walletAmount]);

  // Section above the input
  return (
    <>
      {selectedBank && (
        <ul className="flex flex-col gap-0.5 mt-4 text-xs w-full text-muted-foreground">
          <li className="flex justify-between items-center gap-1.5">
            <strong className="mr-auto">{maxLabel.label}</strong>
            <div className="flex space-x-1">
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
