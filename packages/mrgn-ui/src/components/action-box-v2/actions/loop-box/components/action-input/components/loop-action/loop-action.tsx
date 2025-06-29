import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { clampedNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { LoopActionTxns } from "@mrgnlabs/mrgn-utils";

import { ActionInputTag } from "~/components/action-box-v2/components";

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
        <ActionInputTag
          label={maxLabel.label}
          amount={maxLabel.amount}
          isDisabled={maxAmount === 0 || !selectedSecondaryBank}
          handleOnClick={() => onSetAmountRaw(numberFormater.format(maxAmount))}
        />
      )}
    </>
  );
};
