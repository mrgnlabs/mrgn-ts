import React from "react";

import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { TransactionBroadcastType } from "@mrgnlabs/mrgn-common";
import { ActionMessageType, usePrevious, STATIC_SIMULATION_ERRORS, ActionTxns } from "@mrgnlabs/mrgn-utils";

import { calculateLendingTransaction, calculateSummary, getSimulationResult } from "../utils";
import { SimulationStatus } from "../../../utils/simulation.utils";
/*
How lending action simulation works:
1) If the debounced amount differs from the previous amount, generate an action transaction (actionTxn).
2) If an actionTxn is generated, simulate that transaction.
3) Set the simulation result.
*/

type LendSimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  accountSummary?: AccountSummary;
  selectedBank: ExtendedBankInfo | null;
  lendMode: ActionType;
  actionTxns: ActionTxns;
  simulationResult: SimulationResult | null;
  setSimulationResult: (result: SimulationResult | null) => void;
  setActionTxns: (actionTxns: ActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setIsLoading: (isLoading: boolean) => void;
};

export function useLendSimulation({
  debouncedAmount,
  selectedAccount,
  accountSummary,
  selectedBank,
  lendMode,
  actionTxns,
  simulationResult,
  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
}: LendSimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const [simulationStatus, setSimulationStatus] = React.useState<SimulationStatus>(SimulationStatus.IDLE);
  // for testing purposes, we want to show the slippage error on the first time
  const [isFirstTime, setIsFirstTime] = React.useState(true);

  const handleSimulation = React.useCallback(
    async (txns: (VersionedTransaction | Transaction)[]) => {
      try {
        setSimulationStatus(SimulationStatus.SIMULATING);
        if (selectedAccount && selectedBank && txns.length > 0) {
          const simulationResult = await getSimulationResult({
            actionMode: lendMode,
            account: selectedAccount,
            bank: selectedBank,
            amount: debouncedAmount,
            txns,
          });
          if (simulationResult.actionMethod) {
            setErrorMessage(simulationResult.actionMethod);
            setSimulationResult(null);
          } else {
            // for testing purposes, we want to show the slippage error on the first time
            // and then on second attempt remove so we can simulate a successful retry
            if (isFirstTime) {
              setErrorMessage(STATIC_SIMULATION_ERRORS.SLIPPAGE);
              setSimulationResult(null);
              setIsFirstTime(false);
            } else {
              setErrorMessage(null);
              setSimulationResult(simulationResult.simulationResult);
            }
          }
        } else {
          setSimulationResult(null);
        }
      } catch (error) {
        console.error("Error simulating transaction", error);
        setSimulationResult(null);
      } finally {
        setIsLoading(false);
        setSimulationStatus(SimulationStatus.COMPLETE);
      }
    },
    [
      selectedAccount,
      selectedBank,
      lendMode,
      debouncedAmount,
      setErrorMessage,
      setSimulationResult,
      setIsLoading,
      isFirstTime,
    ]
  );

  const handleActionSummary = React.useCallback(
    (summary?: AccountSummary, result?: SimulationResult) => {
      if (selectedAccount && summary && selectedBank) {
        return calculateSummary({
          simulationResult: result ?? undefined,
          bank: selectedBank,
          actionMode: lendMode,
          accountSummary: summary,
        });
      }
    },
    [selectedAccount, selectedBank, lendMode]
  );

  const fetchActionTxn = React.useCallback(
    async (amount: number) => {
      setSimulationStatus(SimulationStatus.PREPARING);
      // account not ready for simulation
      if (!selectedAccount || !selectedBank || amount === 0) {
        const missingParams = [];
        if (!selectedAccount) missingParams.push("account is null");
        if (amount === 0) missingParams.push("amount is 0");
        if (!selectedBank) missingParams.push("bank is null");

        // console.error(`Can't simulate transaction: ${missingParams.join(", ")}`);
        setActionTxns({ actionTxn: null, additionalTxns: [] });
        return;
      }

      setIsLoading(true);
      try {
        const lendingObject = await calculateLendingTransaction(selectedAccount, selectedBank, lendMode, amount);

        if (lendingObject && "actionTxn" in lendingObject) {
          setActionTxns({ actionTxn: lendingObject.actionTxn, additionalTxns: lendingObject.additionalTxns });
        } else {
          const errorMessage = lendingObject ?? STATIC_SIMULATION_ERRORS.BUILDING_LENDING_TX;
          setErrorMessage(errorMessage);
        }
      } catch (error) {
        console.log(error);
        setErrorMessage(STATIC_SIMULATION_ERRORS.BUILDING_LENDING_TX);
        setIsLoading(false);
      }

      // is set to false in simulation
      // finally {
      //   setIsLoading(false);
      // }
    },
    [selectedAccount, selectedBank, lendMode, setIsLoading, setActionTxns, setErrorMessage]
  );

  const refreshSimulation = React.useCallback(async () => {
    await fetchActionTxn(debouncedAmount ?? 0);
  }, [fetchActionTxn, debouncedAmount]);

  React.useEffect(() => {
    // Reset simulation status when amount changes
    setSimulationStatus(SimulationStatus.PREPARING);
    // only simulate when amount changes
    if (prevDebouncedAmount !== debouncedAmount) {
      fetchActionTxn(debouncedAmount ?? 0);
    }
  }, [prevDebouncedAmount, debouncedAmount, fetchActionTxn]);

  React.useEffect(() => {
    // Only run simulation if we have transactions to simulate
    if (actionTxns?.actionTxn || (actionTxns?.additionalTxns?.length ?? 0) > 0) {
      handleSimulation([
        ...(actionTxns?.additionalTxns ?? []),
        ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
      ]);
    } else {
      // If no transactions, move back to idle state
      setSimulationStatus(SimulationStatus.IDLE);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionTxns]);

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSummary,
    refreshSimulation,
    simulationStatus,
  };
}
