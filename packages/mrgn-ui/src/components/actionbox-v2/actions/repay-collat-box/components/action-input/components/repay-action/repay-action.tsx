import React from "react";
import { IconArrowRight } from "@tabler/icons-react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { clampedNumeralFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";

type RepayActionProps = {
  amountRaw: string;
  repayAmount: number;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  maxAmount: number;
  onSetAmountRaw: (amount: string) => void;
};

export const RepayAction = ({
  maxAmount,
  amountRaw,
  repayAmount,
  selectedBank,
  selectedSecondaryBank,
  onSetAmountRaw,
}: RepayActionProps) => {
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

    const amountLeft = numeralFormatter(selectedBank?.isActive ? selectedBank.position.amount - repayAmount : 0);
    return {
      amount: `${amountLeft} ${selectedBank?.meta.tokenSymbol}`,
      label: "Borrowed: ",
    };
  }, [selectedBank, repayAmount]);

  const isUnchanged = React.useMemo(() => amountRaw === "" || amountRaw === "0", [amountRaw]);

  return (
    <>
      {selectedBank && (
        <ul className="flex flex-col gap-0.5 mt-4 text-xs w-full text-muted-foreground">
          <li className="flex justify-between items-center gap-1.5">
            <strong className="mr-auto">{maxLabel.label}</strong>
            <div className="flex space-x-1">
              {selectedBank?.isActive && !isUnchanged && (
                <div>{clampedNumeralFormatter(selectedBank.position.amount)}</div>
              )}
              {selectedBank?.isActive && !isUnchanged && <IconArrowRight width={12} height={12} />}
              <div>{maxLabel.amount}</div>
              {selectedSecondaryBank && (
                <button
                  className="cursor-pointer text-chartreuse border-b border-transparent transition hover:border-chartreuse"
                  disabled={maxAmount === 0}
                  onClick={() => onSetAmountRaw(numberFormater.format(maxAmount))}
                >
                  MAX
                </button>
              )}

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
