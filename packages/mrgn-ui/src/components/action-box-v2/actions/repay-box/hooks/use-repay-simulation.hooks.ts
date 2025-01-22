import React from "react";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  ActionTxns,
  calculateMaxRepayableCollateral,
  DYNAMIC_SIMULATION_ERRORS,
  extractErrorString,
  RepayActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { TransactionBroadcastType } from "@mrgnlabs/mrgn-common";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "../../../store";
import { SimulationStatus } from "../../../utils/simulation.utils";
import {
  calculateRepayTransactions,
  CalculateRepayTransactionsProps,
  calculateSummary,
  getSimulationResult,
  SimulateActionProps,
} from "../utils";
import { QuoteResponse } from "@jup-ag/api";

type RepaySimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  accountSummary?: AccountSummary;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  actionTxns: RepayActionTxns;
  simulationResult: SimulationResult | null;
  isRefreshTxn: boolean;

  platformFeeBps: number;
  slippageBps: number;

  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: RepayActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setRepayAmount: (repayAmount: number) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
  setMaxAmountCollateral: (maxAmountCollateral?: number) => void;
};

export function useRepaySimulation({
  debouncedAmount,
  selectedAccount,
  marginfiClient,
  accountSummary,
  selectedBank,
  selectedSecondaryBank,
  actionTxns,

  simulationResult,
  isRefreshTxn,

  platformFeeBps,
  slippageBps,

  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setRepayAmount,
  setIsLoading,
  setMaxAmountCollateral,
}: RepaySimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevselectedBank = usePrevious(selectedBank);
  const prevselectedSecondaryBank = usePrevious(selectedSecondaryBank);

  const handleError = (
    actionMessage: ActionMessageType | string,
    callbacks: {
      setErrorMessage: (error: ActionMessageType | null) => void;
      setSimulationResult: (result: SimulationResult | null) => void;
      setActionTxns: (actionTxns: RepayActionTxns) => void;
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
    callbacks.setActionTxns({ actionTxn: null, additionalTxns: [], actionQuote: null });
    console.error(
      "Error simulating transaction",
      typeof actionMessage === "string" ? extractErrorString(actionMessage) : actionMessage.description
    );
    callbacks.setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
  };

  const simulationAction = async (props: SimulateActionProps) => {
    if (props.txns.length > 0) {
      const simulationResult = await getSimulationResult(props);
      console.log("simulationResult", simulationResult);

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

  const fetchRepayActionTxns = async (props: CalculateRepayTransactionsProps) => {
    try {
      const repayActionTxns = await calculateRepayTransactions(props);
      if (repayActionTxns && "repayCollatObject" in repayActionTxns) {
        return {
          actionTxns: { ...repayActionTxns, actionQuote: repayActionTxns?.repayCollatObject?.actionQuote },
          actionMessage: null,
        };
      } else {
        const errorMessage =
          repayActionTxns ?? DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(props.selectedBank?.meta.tokenSymbol); // TODO: deposit or borrow bank here?
        return {
          actionTxns: null,
          actionMessage: errorMessage,
        };
      }
    } catch (error) {
      console.error("Error fetching repay action txns", error);
      return {
        actionTxns: null,
        actionMessage: STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED,
      };
    }
  };

  const handleSimulation = React.useCallback(
    async (amount: number) => {
      try {
        if (amount === 0 || !selectedAccount || !marginfiClient || !selectedBank || !selectedSecondaryBank) {
          setActionTxns({ actionTxn: null, additionalTxns: [], actionQuote: null });
          return;
        }

        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

        let actionType;

        if (selectedBank.address.toBase58() === selectedSecondaryBank.address.toBase58()) {
          actionType = ActionType.Repay;
        } else {
          actionType = ActionType.RepayCollat;
        }

        const props = {
          marginfiAccount: selectedAccount,
          selectedBank: selectedBank,
          selectedSecondaryBank: selectedSecondaryBank,
          connection: marginfiClient.provider.connection,
          platformFeeBps,
          slippageBps,
          repayAmount: amount,
          actionType,
        };

        const repayActionTxns = await fetchRepayActionTxns(props);

        if (repayActionTxns.actionMessage || repayActionTxns.actionTxns === null) {
          handleError(repayActionTxns.actionMessage ?? STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        }

        if (repayActionTxns.actionTxns.amount) {
          setRepayAmount(repayActionTxns.actionTxns.amount);
        }

        const simulationResult = await simulationAction({
          txns: [
            ...(repayActionTxns?.actionTxns?.repayCollatObject?.additionalTxns ?? []),
            ...(repayActionTxns?.actionTxns?.repayCollatObject?.actionTxn
              ? [repayActionTxns?.actionTxns?.repayCollatObject?.actionTxn]
              : []),
          ],
          account: selectedAccount,
          bank: selectedBank,
        });

        if (simulationResult.actionMessage || simulationResult.simulationResult === null) {
          handleError(simulationResult.actionMessage ?? STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        } else if (simulationResult.simulationResult) {
          setSimulationResult(simulationResult.simulationResult);
          setActionTxns(repayActionTxns.actionTxns.repayCollatObject);
        } else {
          throw new Error("Unknown error");
        }
      } catch (error) {
        console.error("Error fetching repay action txns", error);
        setSimulationResult(null);
      } finally {
        setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
      }
    },
    [
      marginfiClient,
      platformFeeBps,
      selectedAccount,
      selectedBank,
      selectedSecondaryBank,
      setActionTxns,
      setErrorMessage,
      setIsLoading,
      setRepayAmount,
      setSimulationResult,
      slippageBps,
    ]
  );

  // React.useEffect(() => {
  //   if (
  //     prevDebouncedAmount !== debouncedAmount ||
  //     prevselectedBank !== selectedBank ||
  //     prevselectedSecondaryBank !== selectedSecondaryBank
  //   ) {
  //     if (debouncedAmount > 0) {
  //       handleSimulation(debouncedAmount);
  //     }
  //   }
  // }, [
  //   debouncedAmount,
  //   selectedBank,
  //   selectedSecondaryBank,
  //   handleSimulation,
  //   prevDebouncedAmount,
  //   prevselectedBank,
  //   prevselectedSecondaryBank,
  // ]);

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount) {
      if (debouncedAmount > 0) {
        handleSimulation(debouncedAmount);
      }
    }
  }, [debouncedAmount, handleSimulation, prevDebouncedAmount]);

  const refreshSimulation = React.useCallback(async () => {
    await handleSimulation(debouncedAmount ?? 0);
  }, [handleSimulation, debouncedAmount]);

  const handleActionSummary = React.useCallback(
    (summary?: AccountSummary, result?: SimulationResult) => {
      if (selectedAccount && summary && selectedBank) {
        return calculateSummary({
          simulationResult: result ?? undefined,
          bank: selectedBank,
          accountSummary: summary,
          actionTxns: actionTxns,
          actionQuote: actionTxns?.actionQuote,
        });
      }
    },
    [selectedAccount, selectedBank, actionTxns]
  );

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  // React.useEffect(() => {
  //   if (isRefreshTxn) {
  //     setActionTxns({ actionTxn: null, additionalTxns: [], actionQuote: null });
  //     setSimulationResult(null);
  //   }
  // }, [isRefreshTxn, setActionTxns, setSimulationResult]);

  ////////////////////////////////
  // Fetch max repayable collat //
  ////////////////////////////////
  const fetchMaxRepayableCollateral = React.useCallback(async () => {
    if (
      selectedBank &&
      selectedSecondaryBank &&
      selectedBank.meta.tokenSymbol !== selectedSecondaryBank.meta.tokenSymbol
    ) {
      const maxAmount = await calculateMaxRepayableCollateral(selectedBank, selectedSecondaryBank, slippageBps);
      if (!maxAmount) {
        const errorMessage = DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(
          selectedSecondaryBank.meta.tokenSymbol
        );
        setErrorMessage(errorMessage);
      } else {
        setMaxAmountCollateral(maxAmount);
      }
    } else {
      setMaxAmountCollateral(undefined);
    }
  }, [selectedBank, selectedSecondaryBank, slippageBps, setErrorMessage, setMaxAmountCollateral]);

  React.useEffect(() => {
    if (!selectedSecondaryBank) {
      return;
    }
    const hasBankChanged = !prevselectedSecondaryBank?.address.equals(selectedSecondaryBank.address);
    if (hasBankChanged) {
      fetchMaxRepayableCollateral();
    }
  }, [selectedSecondaryBank, prevselectedSecondaryBank, fetchMaxRepayableCollateral]);

  return {
    actionSummary,
    refreshSimulation,
  };
}
