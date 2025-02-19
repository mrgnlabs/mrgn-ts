import React from "react";

import { Connection, PublicKey } from "@solana/web3.js";

import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  usePrevious,
  STATIC_SIMULATION_ERRORS,
  ActionTxns,
  extractErrorString,
} from "@mrgnlabs/mrgn-utils";

import { calculateSummary, generateActionTxns, getSimulationResult } from "../utils";
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
      callbacks.setErrorMessage(actionMessage);
    }
    callbacks.setSimulationResult(null);
    callbacks.setActionTxns({ transactions: [] });
    console.error(
      "Error simulating transaction",
      typeof actionMessage === "string" ? extractErrorString(actionMessage) : actionMessage.description
    );
    callbacks.setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
  };

  const simulationAction = async (props: {
    txns: ActionTxns;
    lendMode: ActionType;
    account: MarginfiAccountWrapper;
    bank: ExtendedBankInfo;
    amount: number;
  }) => {
    if (props.txns.transactions.length > 0) {
      const simulationResult = await getSimulationResult({
        actionMode: props.lendMode,
        account: props.account,
        bank: props.bank,
        amount: props.amount,
        txns: props.txns.transactions,
      });

      if (simulationResult.actionMethod) {
        return { simulationResult: null, actionMessage: simulationResult.actionMethod };
      } else if (simulationResult.simulationResult) {
        return { simulationResult: simulationResult.simulationResult, actionMessage: null };
      } else {
        const errorMessage = STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED;
        return { simulationResult: null, actionMessage: errorMessage };
      }
    } else {
      throw new Error("account, bank or transactions are null"); // TODO: return error message?
    }
  };

  const fetchActionTxns = async (props: {
    marginfiAccount: MarginfiAccountWrapper | null;
    marginfiClient: MarginfiClient;
    bank: ExtendedBankInfo;
    lendMode: ActionType;
    stakeAccount?: PublicKey;
    amount: number;
  }): Promise<{
    txns: { actionTxns: ActionTxns; finalAccount: MarginfiAccountWrapper } | null;
    actionMessage: ActionMessageType | null;
  }> => {
    try {
      const _actionTxns = await generateActionTxns(props);

      if (_actionTxns && "transactions" in _actionTxns) {
        return {
          txns: {
            actionTxns: _actionTxns.transactions,
            finalAccount: _actionTxns.finalAccount,
          },
          actionMessage: null,
        };
      } else {
        const errorMessage = _actionTxns ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED;
        return {
          txns: null,
          actionMessage: errorMessage,
        };
      }
    } catch (error) {
      console.error("Error fetching deposit swap action txns", error);
      return {
        txns: null,
        actionMessage: STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED,
      };
    }
  };

  const handleSimulation = React.useCallback(
    async (amount: number) => {
      try {
        if (amount === 0 || !selectedBank || !marginfiClient) {
          // Selected account can be undefined, we'll make a tx for this if so
          console.error("Missing params");
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

        const _actionTxns = await fetchActionTxns(props);

        if (_actionTxns.actionMessage || _actionTxns.txns?.actionTxns === undefined) {
          handleError(_actionTxns.actionMessage ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        }

        const simulationResult = await simulationAction({
          txns: _actionTxns.txns?.actionTxns,
          lendMode: lendMode,
          account: _actionTxns.txns?.finalAccount,
          bank: selectedBank,
          amount: amount,
        });

        if (simulationResult.actionMessage || simulationResult.simulationResult === null) {
          handleError(simulationResult.actionMessage ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        } else if (simulationResult.simulationResult) {
          setSimulationResult(simulationResult.simulationResult);
          setActionTxns(_actionTxns.txns?.actionTxns);
          setErrorMessage(null);
        } else {
          throw new Error("Unknown error"); // TODO: return error message?
        }
      } catch (error) {
        console.error("Error simulating transaction", error);
        setSimulationResult(null);
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
