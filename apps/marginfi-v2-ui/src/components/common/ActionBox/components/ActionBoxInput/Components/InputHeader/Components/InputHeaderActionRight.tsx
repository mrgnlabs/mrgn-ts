import React from "react";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { LstType, RepayType, StakeData, clampedNumeralFormatter } from "~/utils";
import { useLstStore, useUiStore } from "~/store";
import { LendingModes } from "~/types";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconSparkles, IconWallet } from "~/components/ui/icons";
import { nativeToUi } from "@mrgnlabs/mrgn-common";

interface InputHeaderActionProps {
  actionMode: ActionType;
  bank: ExtendedBankInfo | null;
  maxAmount: number;
  walletAmount: number | undefined;
  selectedStakingAccount: StakeData | null;
  onSetAmountRaw: (amount: string) => void;
}

interface ToggleObject {
  toggles: { value: string; text: string }[];
  action: (value: any) => void;
  value: string;
}

export const InputHeaderActionRight = ({
  actionMode,
  bank,
  maxAmount,
  walletAmount,
  selectedStakingAccount,
  onSetAmountRaw,
}: InputHeaderActionProps) => {
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
          amount: formatAmount(walletAmount, bank?.meta.tokenSymbol),
        };

      case ActionType.UnstakeLST:
        return {
          showWalletIcon: true,
          amount: formatAmount(walletAmount, bank?.meta.tokenSymbol),
        };

      default:
        return { amount: "-" };
    }
  }, [bank, actionMode, walletAmount, selectedStakingAccount]);

  return (
    <>
      {bank && actionMode !== ActionType.Repay && (
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
