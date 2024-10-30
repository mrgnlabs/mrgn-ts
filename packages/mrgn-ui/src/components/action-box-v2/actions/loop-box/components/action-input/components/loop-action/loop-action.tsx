import React from "react";
import { IconArrowRight } from "@tabler/icons-react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { clampedNumeralFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { LoopActionTxns } from "@mrgnlabs/mrgn-utils";

type LoopActionProps = {
  walletAmount: number | undefined;
  amountRaw: string;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  maxAmount: number;
  loopActionTxns: LoopActionTxns;
  onSetAmountRaw: (amount: string) => void;
};

export const LoopAction = ({
  walletAmount,
  maxAmount,
  selectedBank,
  selectedSecondaryBank,
  onSetAmountRaw,
}: LoopActionProps) => {
  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const maxLabel = React.useMemo((): {
    amount: string;
    label?: string;
  } => {
    const formatAmount = (amount?: number, symbol?: string) =>
      amount !== undefined ? `${clampedNumeralFormatter(amount)} ${symbol}` : "-";
    return {
      label: "Wallet: ",
      amount: formatAmount(walletAmount, selectedBank?.meta.tokenSymbol),
    };
  }, [selectedBank, walletAmount]);

  return (
    <>
      {selectedBank && (
        <ul className="flex flex-col gap-0.5 mt-4 text-xs w-full text-muted-foreground">
          <li className="flex justify-between items-center gap-1.5">
            <strong className="mr-auto">{maxLabel.label}</strong>
            <div className="flex space-x-1">
              <div>{maxLabel.amount}</div>
              <button
                className="cursor-pointer border-b border-transparent transition text-mfi-action-box-highlight hover:border-mfi-action-box-highlight"
                disabled={maxAmount === 0 || !selectedSecondaryBank}
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
