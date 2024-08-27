import React from "react";

import { AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";

import { useLendBoxStore } from "../store";
import { ActionSummary, calculateSummary, getSimulationResult } from "../utils";
import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { usePrevious } from "@mrgnlabs/mrgn-utils";

export function useLendSimulation(
  debouncedAmount: number,
  selectedAccount: MarginfiAccountWrapper | null,
  accountSummary?: AccountSummary
) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const [lendMode, selectedBank, simulationResult, setSimulationResult] = useLendBoxStore((state) => [
    state.lendMode,
    state.selectedBank,
    state.simulationResult,
    state.setSimulationResult,
  ]);

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

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
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
