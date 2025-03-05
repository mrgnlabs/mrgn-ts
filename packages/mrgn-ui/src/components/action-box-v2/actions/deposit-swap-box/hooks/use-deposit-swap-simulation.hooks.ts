import React from "react";

import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { WalletToken } from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  extractErrorString,
  STATIC_SIMULATION_ERRORS,
  DepositSwapActionTxns,
  usePrevious,
  ActionProcessingError,
  JupiterOptions,
} from "@mrgnlabs/mrgn-utils";

import { SimulationStatus } from "~/components/action-box-v2/utils";

import { calculateSummary, generateDepositSwapTxns, GenerateDepositSwapTxnsProps, getSimulationResult } from "../utils";

type DepositSwapSimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  accountSummary?: AccountSummary;
  depositBank: ExtendedBankInfo | null;
  swapBank: ExtendedBankInfo | WalletToken | null;
  actionTxns: DepositSwapActionTxns;
  simulationResult: SimulationResult | null;
  jupiterOptions: JupiterOptions | null;
  setSimulationResult: (result: SimulationResult | null) => void;
  setActionTxns: (actionTxns: DepositSwapActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
  isDisabled: boolean;
};

export function useDepositSwapSimulation({
  debouncedAmount,
  selectedAccount,
  accountSummary,
  marginfiClient,
  depositBank,
  swapBank,
  actionTxns,
  simulationResult,
  jupiterOptions,
  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
  isDisabled,
}: DepositSwapSimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevDepositBank = usePrevious(depositBank);
  const prevSwapBank = usePrevious(swapBank);

  const handleError = (
    actionMessage: ActionMessageType | string,
    callbacks: {
      setErrorMessage: (error: ActionMessageType | null) => void;
      setSimulationResult: (result: SimulationResult | null) => void;
      setActionTxns: (actionTxns: DepositSwapActionTxns) => void;
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
    callbacks.setActionTxns({ transactions: [], actionQuote: null });
    console.error(
      "Error simulating transaction",
      typeof actionMessage === "string" ? extractErrorString(actionMessage) : actionMessage.description
    );
    callbacks.setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
  };

  const fetchDepositSwapActionTxns = async (
    props: GenerateDepositSwapTxnsProps
  ): Promise<{ actionTxns: DepositSwapActionTxns; account: MarginfiAccountWrapper }> => {
    const depositSwapActionTxns = await generateDepositSwapTxns(props);
    return {
      actionTxns: {
        ...depositSwapActionTxns.actionTxns,
        actionQuote: depositSwapActionTxns.actionTxns.actionQuote ?? null,
      },
      account: depositSwapActionTxns.account,
    };
  };

  const handleSimulation = React.useCallback(
    async (amount: number) => {
      try {
        if (amount === 0 || !depositBank || !marginfiClient || !jupiterOptions || isDisabled) {
          setActionTxns({ transactions: [], actionQuote: null });
          return;
        }

        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

        const props: GenerateDepositSwapTxnsProps = {
          marginfiAccount: selectedAccount ?? null,
          depositBank: depositBank,
          swapBank: swapBank,
          amount: amount,
          marginfiClient: marginfiClient,
          jupiterOptions,
        };

        const { account, actionTxns } = await fetchDepositSwapActionTxns(props);

        const simulationResult = await getSimulationResult({
          txns: actionTxns.transactions,
          account: account,
          bank: depositBank,
        });

        setSimulationResult(simulationResult);
        setActionTxns(actionTxns);
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
          console.error("Error simulating deposit swap action", error);
          handleError(STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED, {
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
      depositBank,
      jupiterOptions,
      marginfiClient,
      selectedAccount,
      setActionTxns,
      setErrorMessage,
      setIsLoading,
      setSimulationResult,
      swapBank,
      isDisabled,
    ]
  );

  React.useEffect(() => {
    if (
      prevDebouncedAmount !== debouncedAmount ||
      prevSwapBank?.address.toBase58() !== swapBank?.address.toBase58() ||
      prevDepositBank?.address.toBase58() !== depositBank?.address.toBase58()
    ) {
      if (debouncedAmount > 0) {
        handleSimulation(debouncedAmount);
      }
    }
  }, [debouncedAmount, handleSimulation, prevDebouncedAmount, prevSwapBank, prevDepositBank, swapBank, depositBank]);

  const refreshSimulation = React.useCallback(async () => {
    await handleSimulation(debouncedAmount ?? 0);
  }, [handleSimulation, debouncedAmount]);

  const handleActionSummary = React.useCallback(
    (summary?: AccountSummary, result?: SimulationResult) => {
      if (summary && depositBank) {
        return calculateSummary({
          simulationResult: result ?? undefined,
          bank: depositBank,
          actionMode: ActionType.Deposit,
          accountSummary: summary,
          actionTxns: actionTxns ?? undefined,
        });
      }
    },
    [actionTxns, depositBank]
  );

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSummary,
    refreshSimulation,
  };
}
