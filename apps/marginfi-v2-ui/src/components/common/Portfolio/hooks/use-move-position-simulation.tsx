import React from "react";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { getSimulationResult, simulatedHealthFactor } from "../utils/move-position.utils";
import { ActionMessageType } from "@mrgnlabs/mrgn-utils";
import { SolanaTransaction } from "@mrgnlabs/mrgn-common";

interface ActionSummary {
  health: number;
  // liqPrice: number;
}

type MovePositionSimulationProps = {
  actionTxns: SolanaTransaction[] | null;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  accountToMoveTo: MarginfiAccountWrapper | null;
  extendedBankInfos: ExtendedBankInfo[];
  activeBank: ActiveBankInfo;
  accountSummary: AccountSummary | null;
  setActionTxns: (actionTxn: SolanaTransaction[]) => void;
  setIsLoading: (state: boolean) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
};

export const useMoveSimulation = ({
  marginfiClient,
  accountToMoveTo,
  selectedAccount,
  activeBank,
  accountSummary,
  setActionTxns,
  setIsLoading,
  setErrorMessage,
}: MovePositionSimulationProps) => {
  const [actionSummary, setActionSummary] = React.useState<ActionSummary | null>(null);

  const generateTxns = React.useCallback(async () => {
    if (
      !marginfiClient ||
      !accountToMoveTo ||
      activeBank.userInfo.maxWithdraw < activeBank.position.amount ||
      !selectedAccount
    ) {
      return;
    }

    try {
      setIsLoading(true);
      const { transactions } = await selectedAccount.makeMovePositionTx(
        activeBank.position.amount,
        activeBank.address,
        accountToMoveTo
      );
      return [...transactions];
    } catch (error) {
      console.error("Error creating transactions", error);
    }
  }, [marginfiClient, accountToMoveTo, activeBank, setIsLoading, selectedAccount]);

  const handleSimulateTxns = React.useCallback(async () => {
    try {
      const txns = await generateTxns();

      if (!txns || !marginfiClient || !selectedAccount || !accountSummary) return;

      const { actionMethod, simulationResult } = await getSimulationResult({
        marginfiClient,
        txns,
        selectedBank: activeBank,
        selectedMarginfiAccount: selectedAccount,
      });

      if (actionMethod) {
        setErrorMessage(actionMethod);
        setActionTxns([]);
      } else {
        if (!simulationResult) return;

        const updatedHealthFactor = simulatedHealthFactor(simulationResult);
        setActionSummary({
          health: updatedHealthFactor,
        });
        setErrorMessage(null);
        setActionTxns(txns);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [
    generateTxns,
    marginfiClient,
    activeBank,
    setErrorMessage,
    setActionTxns,
    setIsLoading,
    accountSummary,
    selectedAccount,
  ]);

  return {
    handleSimulateTxns,
    actionSummary,
    setActionSummary,
  };
};
