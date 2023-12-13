import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useUiStore } from "~/store";

import { Button } from "~/components/ui/button";
import { IconLoader } from "~/components/ui/icons";
import { useWalletContext } from "~/hooks/useWalletContext";

type ActionBoxActionsProps = {
  amount: number;
  maxAmount: number;
  showCloseBalance: boolean;
  isLoading: boolean;
  selectedBank: ExtendedBankInfo | null;
  actionMode: ActionType;
  handleAction: () => void;
};

export const ActionBoxActions = ({
  amount,
  maxAmount,
  showCloseBalance,
  isLoading,
  selectedBank,
  actionMode,
  handleAction,
}: ActionBoxActionsProps) => {
  const { connected } = useWalletContext();

  const isActionDisabled = React.useMemo(() => {
    const isValidInput = amount > 0;
    return ((maxAmount === 0 || !isValidInput) && !showCloseBalance) || isLoading || !connected;
  }, [amount, maxAmount, showCloseBalance, isLoading, connected]);

  const actionText = React.useMemo(() => {
    if (!connected) {
      return "Connect your wallet";
    }
    if (!selectedBank) {
      return "Select token and amount";
    }

    if (showCloseBalance) {
      return "Close account";
    }

    if (maxAmount === 0) {
      switch (actionMode) {
        case ActionType.Deposit:
          return `Insufficient ${selectedBank.meta.tokenSymbol} in wallet`;
        case ActionType.Withdraw:
          return "Nothing to withdraw";
        case ActionType.Borrow:
          return "Deposit a collateral first (lend)";
        case ActionType.Repay:
          return `Insufficient ${selectedBank.meta.tokenSymbol} in wallet for loan repayment`;
        default:
          return "Invalid action";
      }
    }

    if (amount <= 0) {
      return "Add an amount";
    }

    return actionMode;
  }, [actionMode, amount, selectedBank, connected, maxAmount, showCloseBalance]);

  return (
    <Button disabled={isActionDisabled} className="w-full py-6" onClick={handleAction}>
      {isLoading ? <IconLoader /> : actionText}
    </Button>
  );
};
