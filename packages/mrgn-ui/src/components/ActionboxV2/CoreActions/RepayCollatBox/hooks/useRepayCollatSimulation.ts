import React from "react";

import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { useRepayCollatBoxStore } from "../store";
import {
  calculateMaxRepayableCollateral,
  DYNAMIC_SIMULATION_ERRORS,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { useActionBoxStore } from "../../../store";
import { useConnection } from "~/hooks/useConnection";
import { calculateRepayCollateral, calculateSummary, getSimulationResult } from "../utils";
import { AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { VersionedTransaction } from "@solana/web3.js";

export function useRepayCollatSimulation(
  debouncedAmount: number,
  selectedAccount: MarginfiAccountWrapper | null,
  marginfiClient: MarginfiClient,
  accountSummary?: AccountSummary
) {
  const [
    selectedBank,
    selectedSecondaryBank,
    actionMode,
    actionTxns,
    simulationResult,
    setSimulationResult,
    setActionQuote,
    setActionTxns,
    setErrorMessage,
    setRepayAmount,
    setIsLoading,
    setMaxAmountCollateral,
  ] = useRepayCollatBoxStore((state) => [
    state.selectedBank,
    state.selectedSecondaryBank,
    state.actionMode,
    state.actionTxns,
    state.simulationResult,
    state.setSimulationResult,
    state.setActionQuote,
    state.setActionTxns,
    state.setErrorMessage,
    state.setRepayAmount,
    state.setIsLoading,
    state.setMaxAmountCollateral,
  ]);
  const [slippageBps, priorityFee] = useActionBoxStore((state) => [state.slippageBps, state.priorityFee]);
  const { connection } = useConnection();

  const prevSelectedSecondaryBank = usePrevious(selectedSecondaryBank);

  const prevDebouncedAmount = usePrevious(debouncedAmount);

  const prevActionTxn = usePrevious(actionTxns?.actionTxn);

  const handleSimulation = React.useCallback(
    async (txn: VersionedTransaction | null) => {
      if (selectedAccount && selectedBank && txn) {
        console.log("simulating");
        const simulationResult = await getSimulationResult({
          actionMode: actionMode,
          account: selectedAccount,
          bank: selectedBank,
          marginfiClient: marginfiClient,
          actionTxn: txn || null,
        });

        setSimulationResult(simulationResult.simulationResult);
      } else {
        setSimulationResult(null);
      }
    },
    [selectedAccount, selectedBank, actionMode, marginfiClient, setSimulationResult]
  );

  const handleActionSummary = React.useCallback(
    (summary?: AccountSummary, result?: SimulationResult) => {
      if (selectedAccount && summary && selectedBank) {
        return calculateSummary({
          simulationResult: result ?? undefined,
          bank: selectedBank,
          accountSummary: summary,
        });
      }
    },
    [selectedAccount, selectedBank]
  );

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  React.useEffect(() => {
    handleSimulation(actionTxns?.actionTxn ?? null);
  }, [actionTxns, handleSimulation]);

  React.useEffect(() => {
    const prevAction = prevActionTxn?.serialize().length;
    const currentAction = actionTxns.actionTxn?.serialize().length;

    if (prevAction !== currentAction) {
      handleSimulation(actionTxns.actionTxn);
    }
  }, [actionTxns, handleSimulation, prevActionTxn]);

  const fetchRepayCollateralObject = React.useCallback(
    async (amount: number) => {
      if (!selectedBank || !selectedSecondaryBank || !selectedAccount) {
        return;
      }

      if (amount === 0) {
        return;
      }

      setIsLoading(true);
      try {
        const repayCollat = await calculateRepayCollateral(
          selectedAccount,
          selectedBank,
          selectedSecondaryBank,
          amount,
          slippageBps,
          connection,
          priorityFee
        );

        if (repayCollat && "repayTxn" in repayCollat) {
          const actionTxns = {
            actionTxn: repayCollat.repayTxn,
            bundleTipTxn: repayCollat.bundleTipTxn,
          };
          const actionQuote = repayCollat.quote;
          const amountRaw = repayCollat.amount.toString();

          setRepayAmount(amount);
          setActionQuote(actionQuote);
          setActionTxns(actionTxns);
        } else {
          const errorMessage =
            repayCollat ?? DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(selectedSecondaryBank.meta.tokenSymbol);

          setErrorMessage(errorMessage);
        }
      } catch (error) {
        setErrorMessage(STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED);
      } finally {
        setIsLoading(false);
      }
    },
    [
      selectedBank,
      selectedSecondaryBank,
      selectedAccount,
      setIsLoading,
      slippageBps,
      connection,
      priorityFee,
      setRepayAmount,
      setActionQuote,
      setActionTxns,
      setErrorMessage,
    ]
  );

  // Fetch the action object based on the action mode
  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      fetchRepayCollateralObject(debouncedAmount);
    }
  }, [prevDebouncedAmount, debouncedAmount, fetchRepayCollateralObject]);

  const fetchMaxRepayableCollateral = React.useCallback(async () => {
    if (selectedBank && selectedSecondaryBank) {
      const maxAmount = await calculateMaxRepayableCollateral(selectedBank, selectedSecondaryBank, slippageBps);

      if (!maxAmount) {
        const errorMessage = DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(
          selectedSecondaryBank.meta.tokenSymbol
        );

        setErrorMessage(errorMessage);
      } else {
        setMaxAmountCollateral(maxAmount);
      }
    }
  }, [selectedBank, selectedSecondaryBank, slippageBps, setErrorMessage, setMaxAmountCollateral]);

  // Fetch max repayable collateral or max leverage based when the secondary bank changes
  React.useEffect(() => {
    if (!selectedSecondaryBank) {
      return;
    }

    const hasBankChanged = !prevSelectedSecondaryBank?.address.equals(selectedSecondaryBank.address);

    if (hasBankChanged) {
      fetchMaxRepayableCollateral();
    }
  }, [selectedSecondaryBank, prevSelectedSecondaryBank, fetchMaxRepayableCollateral]);

  return {
    actionSummary,
  };
}
