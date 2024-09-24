import React from "react";

import { AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";

import { useLendBoxStore } from "../store";
import { calculateLendingTransaction, calculateSummary, getSimulationResult } from "../utils";
import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { STATIC_SIMULATION_ERRORS, usePrevious } from "@mrgnlabs/mrgn-utils";
import { useActionBoxStore } from "~/components/ActionboxV2/store";

/*
How lending action simulation works:
1) If the debounced amount differs from the previous amount, generate an action transaction (actionTxn).
2) If an actionTxn is generated, simulate that transaction.
3) Set the simulation result.
*/

export function useLendSimulation(
  debouncedAmount: number,
  selectedAccount: MarginfiAccountWrapper | null,
  accountSummary?: AccountSummary
) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const [
    lendMode,
    actionTxns,
    selectedBank,
    simulationResult,
    setSimulationResult,
    setActionTxns,
    setIsLoading,
    setErrorMessage,
  ] = useLendBoxStore((state) => [
    state.lendMode,
    state.actionTxns,
    state.selectedBank,
    state.simulationResult,
    state.setSimulationResult,
    state.setActionTxns,
    state.setIsLoading,
    state.setErrorMessage,
  ]);

  const [priorityFee] = useActionBoxStore((state) => [state.priorityFee]);

  const handleSimulation = React.useCallback(
    async (amountParam: number) => {
      if (selectedAccount && selectedBank && amountParam !== 0) {
        const simulationResult = await getSimulationResult({
          actionMode: lendMode,
          account: selectedAccount,
          bank: selectedBank,
          amount: amountParam,
        });

        setSimulationResult(simulationResult.simulationResult);
      } else {
        setSimulationResult(null);
      }
    },
    [selectedAccount, selectedBank, lendMode, setSimulationResult]
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
      // account not ready for simulation
      if (!selectedAccount || !selectedBank || amount === 0) {
        const missingParams = [];
        if (!selectedAccount) missingParams.push("account is null");
        if (amount === 0) missingParams.push("amount is 0");
        if (!selectedBank) missingParams.push("bank is null");

        console.error(`Can't simulate transaction: ${missingParams.join(", ")}`);
        return;
      }

      setIsLoading(true);
      try {
        const lendingObject = await calculateLendingTransaction(
          selectedAccount,
          selectedBank,
          lendMode,
          amount,
          priorityFee
        );

        if (lendingObject && "actionTxn" in lendingObject) {
          setActionTxns({ actionTxn: lendingObject.actionTxn, additionalTxns: lendingObject.additionalTxns });
        } else {
          const errorMessage = lendingObject ?? STATIC_SIMULATION_ERRORS.BUILDING_LENDING_TX;
          setErrorMessage(errorMessage);
        }
      } catch (error) {
        setErrorMessage(STATIC_SIMULATION_ERRORS.BUILDING_LENDING_TX);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAccount, selectedBank, lendMode, priorityFee, setActionTxns, setErrorMessage, setIsLoading]
  );

  React.useEffect(() => {
    // only simulate when amount changes
    if (prevDebouncedAmount !== debouncedAmount) {
      fetchActionTxn(debouncedAmount ?? 0);
      handleSimulation(debouncedAmount ?? 0);
    }
  }, [prevDebouncedAmount, debouncedAmount, handleSimulation]);

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSummary,
  };
}
