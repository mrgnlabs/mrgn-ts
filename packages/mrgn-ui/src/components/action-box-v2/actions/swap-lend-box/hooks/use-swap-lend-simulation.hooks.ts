import React from "react";

import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { usePrevious } from "@mrgnlabs/mrgn-utils";

type SwapLendSimulationProps = {};

export function useSwapLendSimulation({}: SwapLendSimulationProps) {
  const prevDebouncedAmount = usePrevious(1);

  const handleSimulation = React.useCallback(async (txns: (VersionedTransaction | Transaction)[]) => {}, []);

  const handleActionSummary = React.useCallback((summary?: AccountSummary, result?: SimulationResult) => {}, []);

  const fetchActionTxn = React.useCallback(async (amount: number) => {}, []);

  const refreshSimulation = React.useCallback(async () => {}, []);

  const actionSummary = React.useMemo(() => {
    return undefined;
  }, []);

  return {
    actionSummary,
    refreshSimulation,
  };
}
