import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { nativeToUi, numeralFormatter } from "@mrgnlabs/mrgn-common";

import { StakeData, clampedNumeralFormatter, RepayType, LstType } from "~/utils";

import { IconWallet } from "~/components/ui/icons";
import { InputHeaderAction } from "./InputHeaderAction";

type props = {
  actionMode: ActionType;
  selectedBank: ExtendedBankInfo | null;
  repayMode: RepayType;
  lstType: LstType;
  selectedStakingAccount: StakeData | null;

  amountRaw: string;
  walletAmount: number | undefined;
  maxAmount: number;

  isDialog?: boolean;
  showLendingHeader?: boolean;

  changeLstType: (lstType: LstType) => void;
  changeRepayType: (repayType: RepayType) => void;
  onSetAmountRaw: (amount: string) => void;
};

export const InputHeader = ({
  actionMode,
  isDialog,
  maxAmount,
  amountRaw,
  selectedBank,
  selectedStakingAccount,
  walletAmount,
  repayMode,
  lstType,
  changeRepayType,
  changeLstType,
  onSetAmountRaw,
}: props) => {
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

      case ActionType.UnstakeLST:
        return {
          showWalletIcon: true,
          amount: formatAmount(walletAmount, selectedBank?.meta.tokenSymbol),
        };

      default:
        return { amount: "-" };
    }
  }, [selectedBank, selectedStakingAccount, actionMode, walletAmount]);

  // Section above the input
  return (
    <div className="flex flex-row items-center justify-between mb-2">
      {/* Title text */}

      <div className="text-lg font-normal flex items-center">
        <InputHeaderAction
          actionType={actionMode}
          bank={selectedBank}
          repayType={repayMode}
          lstType={lstType}
          isDialog={isDialog}
          changeRepayType={(value) => changeRepayType(value)}
          changeLstType={(value) => changeLstType(value)}
        />
      </div>

      {/* Amount action */}
      {selectedBank && actionMode !== ActionType.Repay && (
        <div className="inline-flex gap-1.5 items-center">
          {maxLabel.showWalletIcon && <IconWallet size={16} />}
          {maxLabel.label && <span className="text-xs font-normal text-muted-foreground">{maxLabel.label}</span>}
          <span className="text-sm font-normal">{maxLabel.amount}</span>
          <button
            className={`text-xs ml-1 py-1.5 px-3 rounded-full border border-background-gray-light bg-transparent text-muted-foreground ${
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
