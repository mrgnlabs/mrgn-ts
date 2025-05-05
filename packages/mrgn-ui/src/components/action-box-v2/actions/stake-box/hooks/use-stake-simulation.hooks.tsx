import React from "react";

import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

import { MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionMessageType,
  extractErrorString,
  LstData,
  StakeActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
  JupiterOptions,
} from "@mrgnlabs/mrgn-utils";

import { createStakeLstTx, createUnstakeLstTx, createInstantUnstakeLstTx, getSimulationResult } from "../utils";
import { SimulationStatus } from "../../../utils/simulation.utils";
import { useActionBoxStore } from "../../../store";

type StakeSimulationProps = {
  debouncedAmount: number;
  lstData: LstData | null;

  selectedBank: ExtendedBankInfo | null;
  actionMode: ActionType;
  actionTxns: StakeActionTxns;
  simulationResult: any | null;
  marginfiClient: MarginfiClient | null;
  jupiterOptions: JupiterOptions | null;
  setSimulationResult: (result: any | null) => void;
  setActionTxns: (actionTxns: StakeActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
};

export function useStakeSimulation({
  debouncedAmount,
  lstData,
  selectedBank,
  actionMode,
  actionTxns,
  simulationResult,
  marginfiClient,
  jupiterOptions,
  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
}: StakeSimulationProps) {
  const [platformFeeBps] = useActionBoxStore((state) => [state.platformFeeBps]);
  const prevDebouncedAmount = usePrevious(debouncedAmount);

  const handleError = (
    actionMessage: ActionMessageType | string,
    callbacks: {
      setErrorMessage: (error: ActionMessageType | null) => void;
      setSimulationResult: (result: SimulationResult | null) => void;
      setActionTxns: (actionTxns: StakeActionTxns) => void;
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
    callbacks.setActionTxns({
      transactions: [],
      actionQuote: null,
    });
    console.error(
      "Error simulating transaction",
      typeof actionMessage === "string" ? extractErrorString(actionMessage) : actionMessage.description
    );
    callbacks.setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
  };

  const simulationAction = async (props: {
    txns: StakeActionTxns;
    marginfiClient: MarginfiClient;
    bank: ExtendedBankInfo;
  }): Promise<{ simulationSuccess: boolean; actionMessage: ActionMessageType | null }> => {
    if (props.txns.transactions.length > 0) {
      const { actionMethod, simulationSucceeded } = await getSimulationResult({
        marginfiClient: props.marginfiClient,
        txns: props.txns.transactions,
        selectedBank: props.bank,
      });

      if (actionMethod) {
        return { simulationSuccess: false, actionMessage: actionMethod };
      } else if (simulationSucceeded) {
        return { simulationSuccess: true, actionMessage: null };
      } else {
        const errorMessage = STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED;
        return { simulationSuccess: false, actionMessage: errorMessage };
      }
    } else {
      throw new Error("account, bank or transactions are null"); // TODO: return error message?
    }
  };

  const fetchStakeActionTxns = async (props: {
    actionMode: ActionType;
    amount: number;
    marginfiClient: MarginfiClient;
    connection: Connection;
    jupiterOptions: JupiterOptions;
    platformFeeBps: number;
    lstData: LstData;
    selectedBank: ExtendedBankInfo;
  }): Promise<{ txns: StakeActionTxns | null; actionMessage: ActionMessageType | null }> => {
    try {
      let _actionTxns: StakeActionTxns | ActionMessageType;

      console.log("fetching action txns", props.actionMode);

      if (props.actionMode === ActionType.InstantUnstakeLST) {
        _actionTxns = await createInstantUnstakeLstTx({
          amount: props.amount,
          feepayer: props.marginfiClient.wallet.publicKey,
          connection: props.connection,
          jupiterOptions: props.jupiterOptions,
          platformFeeBps: props.platformFeeBps,
        });
      } else if (props.actionMode === ActionType.UnstakeLST) {
        console.log("unstake full");
        _actionTxns = await createUnstakeLstTx({
          destinationStakeAuthority: props.marginfiClient.wallet.publicKey,
          sourceTransferAuthority: props.marginfiClient.wallet.publicKey,
          amount: props.amount,
          feepayer: props.marginfiClient.wallet.publicKey,
          connection: props.connection,
          lstData: props.lstData,
        });
      } else {
        _actionTxns = await createStakeLstTx({
          amount: props.amount,
          selectedBank: props.selectedBank,
          feepayer: props.marginfiClient.wallet.publicKey,
          connection: props.connection,
          lstData: props.lstData,
          jupiterOptions: props.jupiterOptions,
          platformFeeBps: props.platformFeeBps,
        });
      }

      console.log("actionTxns", _actionTxns);

      if (_actionTxns && "transactions" in _actionTxns) {
        return {
          txns: _actionTxns,
          actionMessage: null,
        };
      } else {
        console.log("actionTxns error", _actionTxns);
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
    async (amount: number, actionMode: ActionType) => {
      try {
        const connection = marginfiClient?.provider.connection;

        if (amount === 0 || !selectedBank || !connection || !lstData || !jupiterOptions) {
          // Selected account can be undefined, we'll make a tx for this if so
          setActionTxns({
            transactions: [],
            actionQuote: null,
          });
          return;
        }

        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

        const props = {
          actionMode,
          amount,
          marginfiClient,
          connection,
          jupiterOptions,
          platformFeeBps,
          lstData,
          selectedBank,
        };

        const _actionTxns = await fetchStakeActionTxns(props);

        if (_actionTxns.actionMessage || _actionTxns.txns === null) {
          handleError(_actionTxns.actionMessage ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        }

        const simulationResult = await simulationAction({
          txns: _actionTxns.txns,
          marginfiClient,
          bank: selectedBank,
        });

        if (simulationResult.actionMessage || simulationResult.simulationSuccess === false) {
          handleError(simulationResult.actionMessage ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        } else if (simulationResult.simulationSuccess === true) {
          setSimulationResult(simulationResult);
          setActionTxns(_actionTxns.txns);
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
      jupiterOptions,
      lstData,
      marginfiClient,
      platformFeeBps,
      selectedBank,
      setActionTxns,
      setErrorMessage,
      setIsLoading,
      setSimulationResult,
    ]
  );

  const refreshSimulation = React.useCallback(async () => {
    if (debouncedAmount > 0) {
      await handleSimulation(debouncedAmount, actionMode);
    }
  }, [debouncedAmount, handleSimulation, actionMode]);

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      if (debouncedAmount > 0) {
        handleSimulation(debouncedAmount, actionMode);
      }
    }
  }, [debouncedAmount, handleSimulation, prevDebouncedAmount, actionMode]);

  return {
    refreshSimulation,
  };
}
