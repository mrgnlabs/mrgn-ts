import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import React from "react";
import { ArenaBank } from "~/types/trade-store.types";

interface TradeActionProps {
  maxAmount: number;

  setAmount: (amount: string) => void;
}

export const MaxAction = ({ maxAmount, setAmount }: TradeActionProps) => {
  const maxLabel = React.useMemo((): {
    amount: string;
    showWalletIcon?: boolean;
    label?: string;
  } => {
    const formatAmount = (maxAmount?: number, symbol?: string) =>
      maxAmount !== undefined ? `${dynamicNumeralFormatter(maxAmount, { ignoreMinDisplay: true })}` : "-";

    return {
      amount: formatAmount(maxAmount),
      label: "Wallet: ",
    };
  }, [maxAmount]);
  return (
    <>
      <ul className="flex flex-col gap-0.5 mt-2 text-xs w-full text-muted-foreground">
        <li className="flex justify-between items-center gap-1.5">
          <strong className="mr-auto">{maxLabel.label}</strong>
          <div className="flex space-x-1">
            <div>{maxLabel.amount}</div>

            <button
              className="cursor-pointer border-b border-transparent transition text-mfi-action-box-highlight hover:border-mfi-action-box-highlight"
              disabled={maxAmount === 0}
              onClick={() => {
                setAmount(maxAmount.toString());
              }}
            >
              MAX
            </button>
          </div>
        </li>
      </ul>
    </>
  );
};
