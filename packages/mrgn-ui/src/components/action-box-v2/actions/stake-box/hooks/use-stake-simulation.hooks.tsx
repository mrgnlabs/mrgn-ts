import React from "react";

import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionMessageType,
  extractErrorString,
  LstData,
  StakeActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";

import { createStakeLstTx, createUnstakeLstTx, getSimulationResult } from "../utils";
import { SimulationStatus } from "../../../utils/simulation.utils";
import { useActionBoxStore } from "../../../store";
import { JupiterOptions } from "~/components/settings";

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
  const [hasUserInteracted, setHasUserInteracted] = React.useState(false);

  const handleSimulation = React.useCallback(
    async (txns: (VersionedTransaction | Transaction)[]) => {
      if (!hasUserInteracted) return;
      try {
        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });
        if (selectedBank && txns.length > 0) {
          const { actionMethod } = await getSimulationResult({
            marginfiClient: marginfiClient as MarginfiClient,
            txns,
            selectedBank,
          });

          if (actionMethod) {
            setErrorMessage(actionMethod);
            throw new Error(simulationResult.actionMethod.description);
          } else {
            setErrorMessage(null);
            setSimulationResult(simulationResult);
          }
        } else {
          throw new Error("account, bank or transactions are null");
        }
      } catch (error) {
        console.error("Error simulating transaction", error);
        setSimulationResult(null);
      } finally {
        setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
      }
    },
    [
      selectedBank,
      marginfiClient,
      setSimulationResult,
      simulationResult,
      setIsLoading,
      setErrorMessage,
      hasUserInteracted,
    ]
  );

  const fetchTxs = React.useCallback(
    async (amount: number, actionType: ActionType) => {
      setHasUserInteracted(true);
      const connection = marginfiClient?.provider.connection;

      if (amount === 0 || !selectedBank || !connection || !lstData || !jupiterOptions) {
        const missingParams = [];
        if (amount === 0) missingParams.push("amount");
        if (!selectedBank) missingParams.push("selectedBank");
        if (!connection) missingParams.push("connection");
        if (!lstData) missingParams.push("lstData");

        setActionTxns({
          actionTxn: null,
          additionalTxns: [],
          actionQuote: null,
        });
        return;
      }

      setIsLoading({ isLoading: true, status: SimulationStatus.PREPARING });

      console.log("jupiterOptions", jupiterOptions);

      try {
        if (actionType === ActionType.UnstakeLST) {
          const _actionTxns = await createUnstakeLstTx({
            amount,
            feepayer: marginfiClient.wallet.publicKey,
            connection,
            jupiterOptions,
            platformFeeBps,
          });

          if ("actionTxn" in _actionTxns) {
            setActionTxns(_actionTxns);
          } else {
            setErrorMessage(_actionTxns);
          }
        } else {
          const _actionTxns = await createStakeLstTx({
            amount,
            selectedBank,
            feepayer: marginfiClient.wallet.publicKey,
            connection,
            lstData,
            jupiterOptions,
            platformFeeBps,
          });

          if ("actionTxn" in _actionTxns) {
            setActionTxns(_actionTxns);
          } else {
            setErrorMessage(_actionTxns);
          }
        }
      } catch (error) {
        const msg = extractErrorString(error);
        console.error(`Error while simulating stake action: ${msg}`);
        setErrorMessage(STATIC_SIMULATION_ERRORS.STAKE_SIMULATION_FAILED);
        setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marginfiClient, selectedBank, jupiterOptions, setActionTxns, setIsLoading, platformFeeBps]
  );

  const refreshSimulation = React.useCallback(async () => {
    await fetchTxs(debouncedAmount ?? 0, actionMode);
  }, [fetchTxs, debouncedAmount, actionMode]);

  React.useEffect(() => {
    // only simulate when amount changes
    if (prevDebouncedAmount !== debouncedAmount) {
      // Only set to PREPARING if we're actually going to simulate
      if (debouncedAmount > 0) {
        fetchTxs(debouncedAmount, actionMode);
      }
    }
  }, [prevDebouncedAmount, debouncedAmount, fetchTxs, actionMode, hasUserInteracted]);

  // Add transaction check effect
  React.useEffect(() => {
    // Only run simulation if user has interacted and we have transactions
    if (actionTxns?.actionTxn || (actionTxns?.additionalTxns?.length ?? 0) > 0) {
      handleSimulation([
        ...(actionTxns?.additionalTxns ?? []),
        ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
      ]);
    } else {
      // If no transactions or no user interaction, stay in idle state
      setIsLoading({ isLoading: false, status: SimulationStatus.IDLE });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionTxns]);

  return { handleSimulation, refreshSimulation };
}
