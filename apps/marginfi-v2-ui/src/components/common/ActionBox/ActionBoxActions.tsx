import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { useUiStore } from "~/store";

import { Button } from "~/components/ui/button";

type ActionBoxActionsProps = {
  selectedMode: ActionType;
  amount: number;
  maxAmount: number;
  showCloseBalance: boolean;
  handleAction: () => void;
};

export const ActionBoxActions = ({
  selectedMode,
  amount,
  maxAmount,
  showCloseBalance,
  handleAction,
}: ActionBoxActionsProps) => {
  const [selectedToken] = useUiStore((state) => [state.selectedToken]);

  const isActionDisabled = React.useMemo(() => {
    const isValidInput = amount > 0;
    return (maxAmount === 0 || !isValidInput) && !showCloseBalance;
  }, [amount, showCloseBalance, maxAmount]);

  const actionText = React.useMemo(() => {
    if (!selectedToken) {
      return "Select token and amount";
    }

    if (showCloseBalance) {
      return "Close account";
    }

    if (maxAmount === 0) {
      switch (selectedMode) {
        case ActionType.Deposit:
          return `Insufficient ${selectedToken.meta.tokenSymbol} in wallet`;
        case ActionType.Withdraw:
          return "Nothing to withdraw";
        case ActionType.Borrow:
          return "Deposit a collateral first (lend)";
        case ActionType.Repay:
          return `Insufficient ${selectedToken.meta.tokenSymbol} in wallet for loan repayment`;
        default:
          return "Invalid action";
      }
    }

    if (amount <= 0) {
      return "Add an amount";
    }

    return selectedMode;
  }, [selectedMode, amount, selectedToken, maxAmount, showCloseBalance]);

  return (
    <Button disabled={isActionDisabled} className="w-full py-6" onClick={handleAction}>
      {actionText}
    </Button>
  );
};
