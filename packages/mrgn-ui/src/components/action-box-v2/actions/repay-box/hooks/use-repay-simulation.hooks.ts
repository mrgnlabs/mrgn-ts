import React from "react";

import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  ActionProcessingError,
  calculateMaxRepayableCollateral,
  extractErrorString,
  RepayActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { JupiterOptions } from "~/components/settings";
import { SimulationStatus } from "~/components/action-box-v2/utils";

import {
  calculateRepayTransactions,
  CalculateRepayTransactionsProps,
  calculateSummary,
  getRepaySimulationResult,
} from "../utils";

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
  jupiterOptions: JupiterOptions | null;

  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: RepayActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setRepayAmount: (repayAmount: number) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
  setMaxAmountCollateral: (maxAmountCollateral?: number) => void;
  setMaxOverflowHit: (maxOverflowHit: boolean) => void;
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

  platformFeeBps,
  jupiterOptions,

  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setRepayAmount,
  setIsLoading,
  setMaxAmountCollateral,
  setMaxOverflowHit,
}: RepaySimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);
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
    callbacks.setActionTxns({ transactions: [], actionQuote: null });
    console.error(
      "Error simulating transaction: ",
      typeof actionMessage === "string" ? extractErrorString(actionMessage) : actionMessage
    );
    callbacks.setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
  };

  const fetchRepayActionTxns = async (props: CalculateRepayTransactionsProps) => {
    const repayActionTxns = await calculateRepayTransactions(props);
    return {
      actionTxns: { ...repayActionTxns, actionQuote: repayActionTxns.repayCollatObject.actionQuote },
    };
  };

  const handleSimulation = React.useCallback(
    async (amount: number) => {
      try {
        if (
          amount === 0 ||
          !selectedAccount ||
          !marginfiClient ||
          !selectedBank ||
          !selectedSecondaryBank ||
          !jupiterOptions
        ) {
          setActionTxns({ transactions: [], actionQuote: null });
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
          jupiterOptions,
          repayAmount: amount,
          actionType,
        };

        const repayActionTxns = await fetchRepayActionTxns(props);

        setRepayAmount(repayActionTxns.actionTxns.amount);

        const simulationResult = await getRepaySimulationResult({
          txns: [...repayActionTxns.actionTxns.repayCollatObject.transactions],
          account: selectedAccount,
          bank: selectedBank,
        });

        setSimulationResult(simulationResult);
        setActionTxns(repayActionTxns.actionTxns.repayCollatObject);
        setErrorMessage(null);
      } catch (error) {
        if (error instanceof ActionProcessingError) {
          handleError(error.details, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
        } else {
          // TODO: ADD SENTRY LOG
          console.error("Error simulating repay action", error);
          handleError(STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
        }
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
      jupiterOptions,
    ]
  );

  React.useEffect(() => {
    if (debouncedAmount > 0 && prevDebouncedAmount !== debouncedAmount) {
      handleSimulation(debouncedAmount);
    }
  }, [debouncedAmount, handleSimulation, prevDebouncedAmount]);

  const refreshSimulation = React.useCallback(async () => {
    if (debouncedAmount > 0) {
      await handleSimulation(debouncedAmount);
    }
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

  ////////////////////////////////
  // Fetch max repayable collat //
  ////////////////////////////////
  const fetchMaxRepayableCollateral = React.useCallback(async () => {
    if (
      jupiterOptions &&
      selectedBank &&
      selectedSecondaryBank &&
      selectedBank.meta.tokenSymbol !== selectedSecondaryBank.meta.tokenSymbol
    ) {
      const maxAmount = await calculateMaxRepayableCollateral(
        selectedBank,
        selectedSecondaryBank,
        jupiterOptions.slippageBps,
        jupiterOptions.slippageMode
      );
      if (!maxAmount.amount) {
        setMaxAmountCollateral(0);
        setMaxOverflowHit(false);
      } else {
        setMaxAmountCollateral(maxAmount.amount);
        setMaxOverflowHit(maxAmount.maxOverflowHit);
      }
    } else {
      // If jupiter options are not defined, a bug is occurring.
      if (!jupiterOptions) {
        console.error(
          "An internal configuration issue has occurred: Jupiter options are not defined. Please create a support ticket for assistance."
        );
      }
      setMaxAmountCollateral(0);
      setMaxOverflowHit(false);
    }
  }, [jupiterOptions, selectedBank, selectedSecondaryBank, setMaxAmountCollateral, setMaxOverflowHit]);

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
