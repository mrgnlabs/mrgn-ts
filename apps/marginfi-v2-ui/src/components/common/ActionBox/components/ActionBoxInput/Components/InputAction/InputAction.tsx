import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { nativeToUi, numeralFormatter, sleep } from "@mrgnlabs/mrgn-common";

import { StakeData, clampedNumeralFormatter, RepayType, LstType } from "~/utils";
import { IconArrowRight } from "~/components/ui/icons";

type props = {
  actionMode: ActionType;
  selectedBank: ExtendedBankInfo | null;
  selectedRepayBank: ExtendedBankInfo | null;
  repayMode: RepayType;
  selectedStakingAccount: StakeData | null;

  amountRaw: string;
  repayAmountRaw: string;
  walletAmount: number | undefined;
  maxAmount: number;

  showLendingHeader?: boolean;

  onSetAmountRaw: (amount: string) => void;
};

export const InputAction = ({
  actionMode,
  maxAmount,
  amountRaw,
  repayAmountRaw,
  selectedBank,
  selectedRepayBank,
  selectedStakingAccount,
  walletAmount,
  repayMode,
  onSetAmountRaw,
}: props) => {
  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const repayAmount = React.useMemo(() => {
    const strippedAmount = repayAmountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [repayAmountRaw]);

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
      case ActionType.Deposit:
      case ActionType.Borrow:
        return {
          showWalletIcon: true,
          amount: formatAmount(walletAmount, selectedBank?.meta.tokenSymbol),
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
        if (repayMode === RepayType.RepayRaw) {
          return {
            amount: formatAmount(
              selectedBank?.isActive ? selectedBank.position.amount : undefined,
              selectedBank?.meta.tokenSymbol
            ),
            label: "Borrowed: ",
          };
        } else {
          const strippedAmount = amountRaw.replace(/,/g, "");

          const amount = isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);

          const amountLeft = numeralFormatter(selectedBank?.isActive ? selectedBank.position.amount - amount : 0);
          return {
            amount: `${amountLeft} ${selectedBank?.meta.tokenSymbol}`,
            label: "Borrowed: ",
          };
        }

      case ActionType.MintLST:
        if (selectedStakingAccount) {
          return {
            amount: formatAmount(nativeToUi(selectedStakingAccount.lamports, 9), "SOL"),
          };
        }
        return {
          showWalletIcon: true,
          amount: formatAmount(walletAmount, selectedBank?.meta.tokenSymbol),
        };

      default:
        return { amount: "-" };
    }
  }, [selectedBank, selectedStakingAccount, actionMode, walletAmount, amountRaw, repayMode]);

  const isUnchanged = React.useMemo(() => repayAmount === 0, [repayAmount]);

  // Section above the input
  return (
    <>
      {actionMode === ActionType.Repay && (
        <ul className="flex flex-col gap-0.5 mt-4 text-xs w-full text-muted-foreground">
          <li className="flex justify-between items-center gap-1.5">
            <strong className="mr-auto">{maxLabel.label}</strong>
            <div className="flex gap-1.5 items-center">
              {selectedBank?.isActive && !isUnchanged && clampedNumeralFormatter(selectedBank.position.amount)}
              {selectedBank?.isActive && !isUnchanged && <IconArrowRight width={12} height={12} />}
              {maxLabel.amount}
              {(repayMode === RepayType.RepayRaw || (repayMode === RepayType.RepayCollat && selectedRepayBank)) && (
                <button
                  className="text-chartreuse border-b border-transparent transition hover:border-chartreuse"
                  disabled={maxAmount === 0}
                  onClick={() => onSetAmountRaw(numberFormater.format(maxAmount))}
                >
                  MAX
                </button>
              )}
            </div>
          </li>
          {repayMode === RepayType.RepayCollat && (
            <li className="flex justify-between items-center gap-1.5">
              <strong>Deposited:</strong>

              <div className="flex gap-1.5 items-center">
                {selectedRepayBank?.isActive ? selectedRepayBank.position.amount : 0}
                {selectedRepayBank?.isActive && !isUnchanged && <IconArrowRight width={12} height={12} />}
                {selectedRepayBank?.isActive && !isUnchanged && selectedRepayBank.position.amount - repayAmount}{" "}
                {selectedRepayBank?.meta.tokenSymbol}
              </div>
            </li>
          )}
        </ul>
      )}
    </>
  );
};
