import React from "react";

import { PublicKey } from "@solana/web3.js";

import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  usePrevious,
  STATIC_SIMULATION_ERRORS,
  ActionTxns,
  extractErrorString,
  ActionProcessingError,
} from "@mrgnlabs/mrgn-utils";

import { calculateSummary, generateActionTxns, getLendSimulationResult } from "../utils";
import { SimulationStatus } from "~/components/action-box-v2/utils";

type LendSimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  accountSummary?: AccountSummary;
  selectedBank: ExtendedBankInfo | null;
  lendMode: ActionType;
  actionTxns: ActionTxns;
  simulationResult: SimulationResult | null;
  selectedStakeAccount?: PublicKey;
  setSimulationResult: (result: SimulationResult | null) => void;
  setActionTxns: (actionTxns: ActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
};

export function useLendSimulation({
  debouncedAmount,
  selectedAccount,
  accountSummary,
  selectedBank,
  lendMode,
  simulationResult,
  selectedStakeAccount,
  marginfiClient,
  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
}: LendSimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);

  const handleError = (
    actionMessage: ActionMessageType | string,
    callbacks: {
      setErrorMessage: (error: ActionMessageType | null) => void;
      setSimulationResult: (result: SimulationResult | null) => void;
      setActionTxns: (actionTxns: ActionTxns) => void;
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
      if (actionMessage.code && actionMessage.code === 119) {
        return;
      } else {
        // const _actionMessage: ActionMessageType = {
        //   isEnabled: true,
        //   description: "Insufficient balance",
        // };
        // callbacks.setErrorMessage(_actionMessage);
      }
    }
    callbacks.setSimulationResult(null);
    callbacks.setActionTxns({ transactions: [] });
    console.error(
      "Error simulating transaction",
      typeof actionMessage === "string" ? extractErrorString(actionMessage) : actionMessage.description
    );
    callbacks.setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
  };

  const fetchActionTxns = async (props: {
    marginfiAccount: MarginfiAccountWrapper | null;
    marginfiClient: MarginfiClient;
    bank: ExtendedBankInfo;
    lendMode: ActionType;
    amount: number;
    stakeAccount?: PublicKey;
  }): Promise<{
    actionTxns: ActionTxns;
    finalAccount: MarginfiAccountWrapper;
  }> => {
    const actionTxns = await generateActionTxns(props);

    return {
      actionTxns: {
        transactions: actionTxns.transactions,
      },
      finalAccount: actionTxns.finalAccount,
    };
  };

  const handleSimulation = React.useCallback(
    async (amount: number) => {
      try {
        if (amount === 0 || !selectedBank || !marginfiClient) {
          // Selected account can be undefined, we'll make a tx for this if so
          setActionTxns({ transactions: [] });
          return;
        }

        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

        const props = {
          marginfiAccount: selectedAccount,
          marginfiClient: marginfiClient,
          stakeAccount: selectedStakeAccount,
          bank: selectedBank,
          lendMode: lendMode,
          amount: amount,
        };

        const actionTxns = await fetchActionTxns(props);

        if (actionTxns.finalAccount === null) {
          throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED);
        }

        const simulationResult = await getLendSimulationResult({
          txns: actionTxns.actionTxns.transactions,
          account: actionTxns.finalAccount,
          bank: selectedBank,
          actionMode: lendMode,
          amount: amount,
        });
        setSimulationResult(simulationResult);
        setActionTxns(actionTxns.actionTxns);
        setErrorMessage(null);
      } catch (error) {
        if (error instanceof ActionProcessingError) {
          handleError(error.details, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
        } else {
          // TODO: ADD SENTRY LOG
          console.error("Error simulating lending action", error);
          handleError(STATIC_SIMULATION_ERRORS.SIMULATION_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
        }
      } finally {
        setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
      }
    },
    [
      lendMode,
      marginfiClient,
      selectedAccount,
      selectedBank,
      selectedStakeAccount,
      setActionTxns,
      setErrorMessage,
      setIsLoading,
      setSimulationResult,
    ]
  );

  const refreshSimulation = React.useCallback(async () => {
    if (debouncedAmount > 0) {
      await handleSimulation(debouncedAmount);
    }
  }, [handleSimulation, debouncedAmount]);

  const handleActionSummary = React.useCallback(
    (summary?: AccountSummary, result?: SimulationResult) => {
      if (summary && selectedBank) {
        return calculateSummary({
          simulationResult: result ?? undefined,
          bank: selectedBank,
          actionMode: lendMode,
          accountSummary: summary,
        });
      }
    },
    [selectedBank, lendMode]
  );

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      if (debouncedAmount > 0) {
        handleSimulation(debouncedAmount);
      }
    }
  }, [debouncedAmount, handleSimulation, prevDebouncedAmount]);

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSummary,
    refreshSimulation,
  };
}
