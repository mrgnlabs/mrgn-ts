import React from "react";

import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMethod, STATIC_SIMULATION_ERRORS, usePrevious } from "@mrgnlabs/mrgn-utils";

import { useActionBoxStore } from "../../../store";
import { calculateLendingTransaction, calculateSummary, getSimulationResult } from "../utils";

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
  actionTxns: {
    actionTxn: VersionedTransaction | Transaction | null;
    additionalTxns: (VersionedTransaction | Transaction)[];
  };
  simulationResult: SimulationResult | null;
  setSimulationResult: (result: SimulationResult | null) => void;
  setActionTxns: (actionTxns: {
    actionTxn: VersionedTransaction | Transaction | null;
    additionalTxns: (VersionedTransaction | Transaction)[];
  }) => void;
  setErrorMessage: (error: ActionMethod) => void;
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

  const [priorityFee] = useActionBoxStore((state) => [state.priorityFee]);

  const handleSimulation = React.useCallback(
    async (txns: (VersionedTransaction | Transaction)[]) => {
      try {
        if (selectedAccount && selectedBank && txns.length > 0) {
          const simulationResult = await getSimulationResult({
            actionMode: lendMode,
            account: selectedAccount,
            bank: selectedBank,
            amount: debouncedAmount,
            txns,
          });
          console.log("simulationResult", simulationResult);
          setSimulationResult(simulationResult.simulationResult);
        } else {
          setSimulationResult(null);
        }
      } catch (error) {
        console.error("Error simulating transaction", error);
        setSimulationResult(null);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAccount, debouncedAmount, selectedBank, lendMode, setSimulationResult]
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

        // console.error(`Can't simulate transaction: ${missingParams.join(", ")}`);
        setActionTxns({ actionTxn: null, additionalTxns: [] });
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
        setIsLoading(false);
      }

      // is set to false in simulation
      // finally {
      //   setIsLoading(false);
      // }
    },
    [selectedAccount, selectedBank, lendMode, priorityFee, setActionTxns, setErrorMessage, setIsLoading]
  );

  React.useEffect(() => {
    // only simulate when amount changes
    if (prevDebouncedAmount !== debouncedAmount) {
      fetchActionTxn(debouncedAmount ?? 0);
    }
  }, [prevDebouncedAmount, debouncedAmount, fetchActionTxn]);

  React.useEffect(() => {
    handleSimulation([
      ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
      ...(actionTxns?.additionalTxns ?? []),
    ]);
  }, [actionTxns]);

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSummary,
  };
}
