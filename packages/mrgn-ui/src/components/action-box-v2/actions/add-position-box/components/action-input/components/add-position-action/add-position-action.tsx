import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { clampedNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { LoopActionTxns } from "@mrgnlabs/mrgn-utils";

import { ActionInputTag } from "~/components/action-box-v2/components";

type AddPositionActionProps = {
  walletAmount: number | undefined;
  amountRaw: string;
  quoteBank: ExtendedBankInfo;
  maxAmount: number;
  onSetAmountRaw: (amount: string) => void;
};

export const AddPositionAction = ({ walletAmount, maxAmount, quoteBank, onSetAmountRaw }: AddPositionActionProps) => {
  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const maxLabel = React.useMemo((): {
    amount: string;
    label: string;
  } => {
    const formatAmount = (amount?: number, symbol?: string) =>
      amount !== undefined ? `${clampedNumeralFormatter(amount)} ${symbol}` : "-";
    return {
      label: "Wallet: ",
      amount: formatAmount(walletAmount, quoteBank.meta.tokenSymbol),
    };
  }, [quoteBank.meta.tokenSymbol, walletAmount]);

  return (
    <>
      <ActionInputTag
        label={maxLabel.label}
        amount={maxLabel.amount}
        isDisabled={maxAmount === 0}
        handleOnClick={() => onSetAmountRaw(numberFormater.format(maxAmount))}
      />
    </>
  );
};
