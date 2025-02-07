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
  DepositSwapActionTxns,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { SimulationStatus } from "~/components/action-box-v2/utils";
import {
  calculateSummary,
  generateDepositSwapTxns,
  GenerateDepositSwapTxnsProps,
  getSimulationResult,
  SimulateActionProps,
} from "../utils";
import { JupiterOptions } from "~/components/settings/settings";
import { WalletToken } from "@mrgnlabs/mrgn-common";

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

  const simulationAction = async (props: SimulateActionProps) => {
    if (props.txns.length > 0) {
      const simulationResult = await getSimulationResult(props);
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

  const fetchDepositSwapActionTxns = async (
    props: GenerateDepositSwapTxnsProps
  ): Promise<{ actionTxns: DepositSwapActionTxns | null; actionMessage: ActionMessageType | null }> => {
    try {
      const depositSwapActionTxns = await generateDepositSwapTxns(props);
      if (depositSwapActionTxns && "transactions" in depositSwapActionTxns) {
        return {
          actionTxns: { ...depositSwapActionTxns, actionQuote: depositSwapActionTxns.actionQuote },
          actionMessage: null,
        };
      } else {
        const errorMessage = depositSwapActionTxns ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED;
        return {
          actionTxns: null,
          actionMessage: errorMessage,
        };
      }
    } catch (error) {
      console.error("Error fetching deposit swap action txns", error);
      return {
        actionTxns: null,
        actionMessage: STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED,
      };
    }
  };

  const handleSimulation = React.useCallback(
    async (amount: number) => {
      try {
        if (amount === 0 || !depositBank || !selectedAccount || !marginfiClient || !jupiterOptions || isDisabled) {
          // TODO: will there be cases where the account isnt defined? In arena esp?
          setActionTxns({ transactions: [], actionQuote: null });
          return;
        }

        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

        const props: GenerateDepositSwapTxnsProps = {
          marginfiAccount: selectedAccount ?? undefined,
          depositBank: depositBank,
          swapBank: swapBank,
          amount: amount,
          marginfiClient: marginfiClient,
          jupiterOptions,
        };

        const depositSwapActionTxns = await fetchDepositSwapActionTxns(props);

        if (depositSwapActionTxns.actionMessage || depositSwapActionTxns.actionTxns === null) {
          handleError(depositSwapActionTxns.actionMessage ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        }

        const simulationResult = await simulationAction({
          txns: [...(depositSwapActionTxns?.actionTxns?.transactions ?? [])],
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
          setActionTxns(depositSwapActionTxns.actionTxns);
          setErrorMessage(null);
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
