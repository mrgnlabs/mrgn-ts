import React from "react";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { LstType, RepayType, clampedNumeralFormatter } from "~/utils";
import { useLstStore, useUiStore } from "~/store";
import { LendingModes } from "~/types";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconSparkles } from "~/components/ui/icons";

interface InputHeaderActionProps {
  actionMode: ActionType;
  bank: ExtendedBankInfo | null;
  walletAmount: number | undefined;
  isDialog?: boolean;
  repayType: RepayType;
  lstType: LstType;
  changeRepayType: (repayType: RepayType) => void;
  changeLstType: (lstType: LstType) => void;
}

interface ToggleObject {
  toggles: { value: string; text: string }[];
  action: (value: any) => void;
  value: string;
}

export const InputHeaderActionLeft = ({
  actionMode,
  bank,
  walletAmount,
  lstType,
  isDialog,
  repayType,
  changeRepayType,
  changeLstType,
}: InputHeaderActionProps) => {
  const [lendingModeFromStore, setLendingMode] = useUiStore((state) => [state.lendingMode, state.setLendingMode]);
  const [stakeAccounts] = useLstStore((state) => [state.stakeAccounts]);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const maxLabel = React.useMemo((): {
    amount: string;
    showWalletIcon?: boolean;
    label?: string;
  } => {
    if (!bank) {
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
          amount: formatAmount(walletAmount, bank?.meta.tokenSymbol),
        };

      case ActionType.Withdraw:
        return {
          amount: formatAmount(bank?.isActive ? bank.position.amount : undefined, bank?.meta.tokenSymbol),
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
  }, [selectedBank, actionMode, walletAmount, selectedStakingAccount]);

  return (
    <>
      {bank && actionType !== ActionType.Repay && (
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
    </>
  );
};
