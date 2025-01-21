import React from "react";

import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
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
  connection?: Connection;
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
  actionTxns,
  simulationResult,
  connection,
  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
}: LendSimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);

  const handleSimulation = React.useCallback(
    async (txns: (VersionedTransaction | Transaction)[]) => {
      try {
        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });
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
            throw new Error(simulationResult.actionMethod.description);
          } else {
            setErrorMessage(null);
            setSimulationResult(simulationResult.simulationResult);
          }
        } else {
          throw new Error("account, bank or transactions are null");
        }
      } catch (error) {
        console.error("Error simulating transaction:", error);
        setSimulationResult(null);
      } finally {
        setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
      }
    },
    [selectedAccount, selectedBank, lendMode, debouncedAmount, setErrorMessage, setSimulationResult, setIsLoading]
  );

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

  const fetchActionTxn = React.useCallback(
    async (amount: number) => {
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

      setIsLoading({ isLoading: true, status: SimulationStatus.PREPARING });

      try {
        const lendingObject = await calculateLendingTransaction(
          selectedAccount,
          selectedBank,
          lendMode,
          amount,
          connection
        );

        if (lendingObject && "actionTxn" in lendingObject) {
          setActionTxns({ actionTxn: lendingObject.actionTxn, additionalTxns: lendingObject.additionalTxns });
          setErrorMessage(null);
        } else {
          const errorMessage = lendingObject ?? STATIC_SIMULATION_ERRORS.BUILDING_LENDING_TX;
          setErrorMessage(errorMessage);
          console.error("Error building lending transaction: ", errorMessage.description);
          setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
        }
      } catch (error) {
        console.error("Error building lending transaction:", error);
        setErrorMessage(STATIC_SIMULATION_ERRORS.BUILDING_LENDING_TX);
        setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
      }
    },
    [selectedAccount, selectedBank, lendMode, setIsLoading, setActionTxns, setErrorMessage, connection]
  );

  const refreshSimulation = React.useCallback(async () => {
    await fetchActionTxn(debouncedAmount ?? 0);
  }, [fetchActionTxn, debouncedAmount]);

  React.useEffect(() => {
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
      setSimulationResult(null);
      setIsLoading({ isLoading: false, status: SimulationStatus.IDLE });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionTxns]);

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSummary,
    refreshSimulation,
  };
}
