import React from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  ActionTxns,
  calculateMaxRepayableCollateral,
  DYNAMIC_SIMULATION_ERRORS,
  extractErrorString,
  RepayActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { TransactionBroadcastType } from "@mrgnlabs/mrgn-common";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "../../../store";
import { SimulationStatus } from "../../../utils/simulation.utils";
import { calculateSummary, SimulateActionProps } from "../utils";
import { QuoteResponse } from "@jup-ag/api";

type RepaySimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  accountSummary?: AccountSummary;
  selectedDepositBank: ExtendedBankInfo | null;
  selectedBorrowBank: ExtendedBankInfo | null;
  actionTxns: RepayActionTxns;
  simulationResult: SimulationResult | null;
  isRefreshTxn: boolean;

  platformFeeBps: number;
  slippageBps: number;

  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: RepayActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setRepayAmount: (repayAmount: number) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
  setMaxAmountCollateral: (maxAmountCollateral?: number) => void;
};

export function useRepaySimulation({
  debouncedAmount,
  selectedAccount,
  marginfiClient,
  accountSummary,
  selectedDepositBank,
  selectedBorrowBank,
  actionTxns,

  simulationResult,
  isRefreshTxn,

  platformFeeBps,
  slippageBps,

  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setRepayAmount,
  setIsLoading,
  setMaxAmountCollateral,
}: RepaySimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevSelectedDepositBank = usePrevious(selectedDepositBank);
  const prevSelectedBorrowBank = usePrevious(selectedBorrowBank);

  const handleError = (
    actionMessage: ActionMessageType | string,
    callbacks: {
      setErrorMessage: (error: ActionMessageType | null) => void;
      setSimulationResult: (result: SimulationResult | null) => void;
      setActionTxns: (actionTxns: RepayActionTxns) => void;
      setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
    }
  ) => {
    if (typeof actionMessage === "string") {
      const errorMessage = extractErrorString(actionMessage);
      const _actionMessage: ActionMessageType = {
        isEnabled: true,
        description: errorMessage,
      };
      callbacks.setErrorMessage(_actionMessage);
    } else {
      callbacks.setErrorMessage(actionMessage);
    }
    callbacks.setSimulationResult(null);
    callbacks.setActionTxns({ actionTxn: null, additionalTxns: [], actionQuote: null });
    console.error(
      "Error simulating transaction",
      typeof actionMessage === "string" ? extractErrorString(actionMessage) : actionMessage.description
    );
    callbacks.setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
  };

  const simulationAction = async (props: SimulateActionProps) => {};

  const fetchRepayActionTxns = async (props: any) => {};

  const handleSimulation = React.useCallback(async (amount: number) => {}, []);

  React.useEffect(() => {
    if (
      prevDebouncedAmount !== debouncedAmount ||
      prevSelectedDepositBank !== selectedDepositBank ||
      prevSelectedBorrowBank !== selectedBorrowBank
    ) {
      if (debouncedAmount > 0) {
        handleSimulation(debouncedAmount);
      }
    }
  }, [
    debouncedAmount,
    selectedDepositBank,
    selectedBorrowBank,
    handleSimulation,
    prevDebouncedAmount,
    prevSelectedDepositBank,
    prevSelectedBorrowBank,
  ]);

  const refreshSimulation = React.useCallback(async () => {
    await handleSimulation(debouncedAmount ?? 0);
  }, [handleSimulation, debouncedAmount]);

  const handleActionSummary = React.useCallback(
    (summary?: AccountSummary, result?: SimulationResult) => {
      if (selectedAccount && summary && selectedDepositBank) {
        return calculateSummary({
          simulationResult: result ?? undefined,
          bank: selectedDepositBank,
          accountSummary: summary,
          actionTxns: actionTxns,
          actionQuote: actionTxns?.actionQuote,
        });
      }
    },
    [selectedAccount, selectedDepositBank, actionTxns]
  );

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  React.useEffect(() => {
    if (isRefreshTxn) {
      setActionTxns({ actionTxn: null, additionalTxns: [], actionQuote: null });
      setSimulationResult(null);
    }
  }, [isRefreshTxn, setActionTxns, setSimulationResult]);

  ////////////////////////////////
  // Fetch max repayable collat //
  ////////////////////////////////
  const fetchMaxRepayableCollateral = React.useCallback(async () => {
    if (selectedDepositBank && selectedBorrowBank) {
      const maxAmount = await calculateMaxRepayableCollateral(selectedDepositBank, selectedBorrowBank, slippageBps);

      if (!maxAmount) {
        const errorMessage = DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(selectedBorrowBank.meta.tokenSymbol);
        setErrorMessage(errorMessage);
      } else {
        setMaxAmountCollateral(maxAmount);
      }
    } else {
      setMaxAmountCollateral(undefined);
    }
  }, [selectedDepositBank, selectedBorrowBank, slippageBps, setErrorMessage, setMaxAmountCollateral]);

  React.useEffect(() => {
    if (!selectedBorrowBank) {
      return;
    }
    const hasBankChanged = !selectedBorrowBank?.address.equals(selectedBorrowBank.address);
    if (hasBankChanged) {
      fetchMaxRepayableCollateral();
    }
  }, [selectedBorrowBank, prevSelectedBorrowBank, fetchMaxRepayableCollateral]);

  return {
    actionSummary,
    refreshSimulation,
  };
}
