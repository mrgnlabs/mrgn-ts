import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { nativeToUi } from "@mrgnlabs/mrgn-common";

import { StakeData, clampedNumeralFormatter, RepayType } from "~/utils";

import { IconWallet } from "~/components/ui/icons";
import { InputHeaderAction } from "./InputHeaderAction";

type props = {
  actionMode: ActionType;
  selectedBank: ExtendedBankInfo | null;
  repayMode: RepayType;
  selectedStakingAccount: StakeData | null;

  walletAmount: number | undefined;
  maxAmount: number;

  isDialog?: boolean;
  showLendingHeader?: boolean;

  changeRepayType: (repayType: RepayType) => void;
  onSetAmountRaw: (amount: string) => void;
};

export const InputHeader = ({
  actionMode,
  isDialog,
  maxAmount,
  selectedBank,
  selectedStakingAccount,
  walletAmount,
  repayMode,
  showLendingHeader,
  changeRepayType,
  onSetAmountRaw,
}: props) => {
  const titleText = React.useMemo(() => {
    const actionTitles: { [key in ActionType]?: string } = {
      [ActionType.Borrow]: "You borrow",
      [ActionType.Deposit]: "You supply",
      [ActionType.Withdraw]: "You withdraw",
      [ActionType.Repay]: "You repay",
      [ActionType.MintLST]: "You stake",
    };

    return actionTitles[actionMode] || "";
  }, [actionMode]);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const showTitleText = React.useMemo(() => {
    return !isDialog || actionMode === ActionType.MintLST || actionMode === ActionType.Repay;
  }, [isDialog, actionMode]);

  const maxTitle = React.useMemo(() => {
    switch (actionMode) {
      case ActionType.Deposit:
      case ActionType.Borrow:
      case ActionType.Withdraw:
      case ActionType.Repay:
        return `${actionMode} Full`;

      case ActionType.MintLST:
      case ActionType.MintYBX:
        return "Mint Full";

      default:
        return "Max";
    }
  }, [actionMode]);

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
        return {
          amount: formatAmount(
            selectedBank?.isActive ? selectedBank.position.amount : undefined,
            selectedBank?.meta.tokenSymbol
          ),
          label: "Borrowed: ",
        };

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
  }, [selectedBank, selectedStakingAccount, actionMode, walletAmount, repayMode]);

  // Section above the input
  return (
    <div className="flex flex-row items-center justify-between mb-3">
      {/* Title text */}

      <div className="text-lg font-normal flex items-center">
        <InputHeaderAction
          actionType={actionMode}
          bank={selectedBank}
          repayType={repayMode}
          isDialog={isDialog}
          changeRepayType={(value) => changeRepayType(value)}
        />
      </div>

      {/* Amount action */}
      {selectedBank && (
        <div className="inline-flex gap-1.5 items-center">
          {maxLabel.showWalletIcon && <IconWallet size={16} />}
          {maxLabel.label && <span className="text-xs font-normal text-muted-foreground">{maxLabel.label}</span>}
          <span className="text-sm font-normal">{maxLabel.amount}</span>
          <button
            className={`text-xs ml-1 h-6 py-1 px-2 rounded-full border border-background-gray-light bg-transparent text-muted-foreground ${
              maxAmount === 0 ? "" : "cursor-pointer hover:bg-background-gray-light"
            } transition-colors`}
            onClick={() => onSetAmountRaw(numberFormater.format(maxAmount))}
            disabled={maxAmount === 0}
          >
            {"MAX"}
          </button>
        </div>
      )}
    </div>
  );
};
