import React from "react";

import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  ActionTxns,
  DYNAMIC_SIMULATION_ERRORS,
  extractErrorString,
  STATIC_SIMULATION_ERRORS,
  SwapLendActionTxns,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { SimulationStatus } from "~/components/action-box-v2/utils";
import {
  calculateSummary,
  generateSwapLendTxns,
  GenerateSwapLendTxnsProps,
  getSimulationResult,
  SimulateActionProps,
} from "../utils";

type SwapLendSimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  accountSummary?: AccountSummary;
  depositBank: ExtendedBankInfo | null;
  swapBank: ExtendedBankInfo | null;
  actionTxns: SwapLendActionTxns;
  simulationResult: SimulationResult | null;
  setSimulationResult: (result: SimulationResult | null) => void;
  setActionTxns: (actionTxns: SwapLendActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
};

export function useSwapLendSimulation({
  debouncedAmount,
  selectedAccount,
  accountSummary,
  marginfiClient,
  depositBank,
  swapBank,
  actionTxns,
  simulationResult,
  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
}: SwapLendSimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevDepositBank = usePrevious(depositBank);
  const prevSwapBank = usePrevious(swapBank);

  const handleError = (
    actionMessage: ActionMessageType | string,
    callbacks: {
      setErrorMessage: (error: ActionMessageType | null) => void;
      setSimulationResult: (result: SimulationResult | null) => void;
      setActionTxns: (actionTxns: SwapLendActionTxns) => void;
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

  const simulationAction = async (props: SimulateActionProps) => {
    if (props.txns.length > 0) {
      const simulationResult = await getSimulationResult(props);

      console.log("simulationResult", simulationResult);

      if (simulationResult.actionMethod) {
        return { simulationResult: null, actionMessage: simulationResult.actionMethod };
      } else if (simulationResult.simulationResult) {
        return { simulationResult: simulationResult.simulationResult, actionMessage: null };
      } else {
        const errorMessage = DYNAMIC_SIMULATION_ERRORS.TRADE_FAILED_CHECK();
        return { simulationResult: null, actionMessage: errorMessage };
      }
    } else {
      throw new Error("account, bank or transactions are null");
    }
  };

  const fetchSwapLendActionTxns = async (
    props: GenerateSwapLendTxnsProps
  ): Promise<{ actionTxns: SwapLendActionTxns | null; actionMessage: ActionMessageType | null }> => {
    try {
      const swapLendActionTxns = await generateSwapLendTxns(props);
      if (swapLendActionTxns && "actionTxn" in swapLendActionTxns) {
        return {
          actionTxns: { ...swapLendActionTxns, actionQuote: swapLendActionTxns.actionQuote },
          actionMessage: null,
        };
      } else {
        const errorMessage = swapLendActionTxns ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED;
        return {
          actionTxns: null,
          actionMessage: errorMessage,
        };
      }
    } catch (error) {
      console.error("Error fetching swap lend action txns", error);
      return {
        actionTxns: null,
        actionMessage: STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED,
      };
    }
  };

  const handleSimulation = React.useCallback(
    async (amount: number) => {
      try {
        if (amount === 0 || !depositBank || !selectedAccount || !marginfiClient) {
          // TODO: will there be cases where the account isnt defined? In arena esp?
          setActionTxns({ actionTxn: null, additionalTxns: [], actionQuote: null });
          return;
        }

        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

        const props: GenerateSwapLendTxnsProps = {
          marginfiAccount: selectedAccount ?? undefined,
          depositBank: depositBank,
          swapBank: swapBank,
          amount: amount,
          marginfiClient: marginfiClient,
          slippageBps: 50,
        };

        const swapLendActionTxns = await fetchSwapLendActionTxns(props);

        if (swapLendActionTxns.actionMessage || swapLendActionTxns.actionTxns === null) {
          handleError(swapLendActionTxns.actionMessage ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        }

        const simulationResult = await simulationAction({
          txns: [
            ...(swapLendActionTxns?.actionTxns?.additionalTxns ?? []),
            ...(swapLendActionTxns?.actionTxns?.actionTxn ? [swapLendActionTxns?.actionTxns?.actionTxn] : []),
          ],
          account: selectedAccount,
          bank: depositBank,
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
          setActionTxns(swapLendActionTxns.actionTxns);
        } else {
          throw new Error("Unknown error");
        }
      } catch (error) {
        console.error("Error simulating transaction", error);
        setSimulationResult(null);
      } finally {
        setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
      }
    },
    [depositBank, marginfiClient, selectedAccount, setActionTxns, setIsLoading, setSimulationResult, swapBank]
  );

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount || prevDepositBank !== depositBank || prevSwapBank !== swapBank) {
      if (debouncedAmount > 0) {
        handleSimulation(debouncedAmount);
      }
    }
  }, [debouncedAmount, depositBank, handleSimulation, prevDebouncedAmount, prevDepositBank, prevSwapBank, swapBank]);

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
        });
      }
    },
    [depositBank]
  );

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSummary,
    refreshSimulation,
  };
}