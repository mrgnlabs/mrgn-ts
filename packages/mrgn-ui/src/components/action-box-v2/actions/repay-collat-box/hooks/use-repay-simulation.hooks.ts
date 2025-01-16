import React from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  calculateMaxRepayableCollateral,
  CalculateRepayCollateralProps,
  DYNAMIC_SIMULATION_ERRORS,
  extractErrorString,
  RepayCollatActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { TransactionBroadcastType } from "@mrgnlabs/mrgn-common";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "../../../store";
import { SimulationStatus } from "../../../utils/simulation.utils";
import { calculateRepayCollateral, calculateSummary, getSimulationResult } from "../utils";
import { JupiterOptions } from "~/components/settings";

type RepayCollatSimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  accountSummary?: AccountSummary;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  actionTxns: RepayCollatActionTxns;
  simulationResult: SimulationResult | null;
  isRefreshTxn: boolean;
  jupiterOptions: JupiterOptions | null;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: RepayCollatActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setRepayAmount: (repayAmount: number) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
  setMaxAmountCollateral: (maxAmountCollateral: number) => void;
};

export function useRepayCollatSimulation({
  debouncedAmount,
  selectedAccount,
  marginfiClient,
  accountSummary,
  selectedBank,
  selectedSecondaryBank,
  actionTxns,
  simulationResult,
  isRefreshTxn,
  jupiterOptions,
  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setRepayAmount,
  setIsLoading,
  setMaxAmountCollateral,
}: RepayCollatSimulationProps) {
  const [platformFeeBps] = useActionBoxStore((state) => [state.platformFeeBps]);

  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevSelectedBank = usePrevious(selectedBank);
  const prevSelectedSecondaryBank = usePrevious(selectedSecondaryBank);
  const handleError = (
    actionMessage: ActionMessageType | string,
    callbacks: {
      setErrorMessage: (error: ActionMessageType | null) => void;
      setSimulationResult: (result: SimulationResult | null) => void;
      setActionTxns: (actionTxns: RepayCollatActionTxns) => void; // TODO: repay props not repay collat
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

  const fetchRepayActionTxns = async (props: CalculateRepayCollateralProps) => {
    try {
      const repayCollatActionTxns = await calculateRepayTransaction(props);
      if (repayCollatActionTxns && "repayCollatObject" in repayCollatActionTxns) {
        return {
          actionTxns: { ...repayCollatActionTxns, actionQuote: repayCollatActionTxns?.repayCollatObject?.actionQuote },
          actionMessage: null,
        };
      } else {
        const errorMessage =
          repayCollatActionTxns ??
          DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(props.depositBank?.meta.tokenSymbol); // TODO: deposit or borrow bank here?
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
      if (
        !selectedAccount ||
        !marginfiClient ||
        !selectedBank ||
        !selectedSecondaryBank ||
        amount === 0 ||
        !jupiterOptions
      ) {
        const missingParams = [];
        if (!selectedAccount) missingParams.push("account is null");
        if (amount === 0) missingParams.push("amount is 0");
        if (!selectedBank) missingParams.push("bank is null");

        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

        const props: CalculateRepayCollateralProps = {
          marginfiAccount: selectedAccount,
          borrowBank: selectedBank,
          depositBank: selectedSecondaryBank,
          withdrawAmount: amount,
          connection: marginfiClient.provider.connection,
          platformFeeBps,
          slippageBps: jupiterOptions?.slippageBps,
          slippageMode: jupiterOptions?.slippageMode,
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
          setActionTxns(repayCollatActionTxns.actionTxns.repayCollatObject);
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
      setSimulationResult,
      jupiterOptions,
      platformFeeBps,
      setRepayAmount,
      setErrorMessage,
    ]
  );

  React.useEffect(() => {
    if (
      prevDebouncedAmount !== debouncedAmount ||
      prevSelectedBank !== selectedBank ||
      prevSelectedSecondaryBank !== selectedSecondaryBank
    ) {
      if (debouncedAmount > 0) {
        handleSimulation(debouncedAmount);
      }
    }
  }, [
    debouncedAmount,
    selectedBank,
    selectedSecondaryBank,
    handleSimulation,
    prevDebouncedAmount,
    prevSelectedBank,
    prevSelectedSecondaryBank,
  ]);

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
        });
      }
    },
    [selectedAccount, selectedBank, actionTxns]
  );

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  React.useEffect(() => {
    if (isRefreshTxn) {
      setActionTxns({ actionTxn: null, additionalTxns: [], actionQuote: null, lastValidBlockHeight: undefined });
      setSimulationResult(null);
    }
  }, [isRefreshTxn, setActionTxns, setSimulationResult]);

  ////////////////////////////////
  // Fetch max repayable collat //
  ////////////////////////////////
  const fetchMaxRepayableCollateral = React.useCallback(async () => {
    if (selectedBank && selectedSecondaryBank && jupiterOptions) {
      const maxAmount = await calculateMaxRepayableCollateral(
        selectedBank,
        selectedSecondaryBank,
        jupiterOptions?.slippageBps,
        jupiterOptions?.slippageMode
      );

      if (!maxAmount) {
        const errorMessage = DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(
          selectedSecondaryBank.meta.tokenSymbol
        );
        setErrorMessage(errorMessage);
      } else {
        setMaxAmountCollateral(maxAmount);
      }
    }
  }, [selectedBank, selectedSecondaryBank, jupiterOptions, setErrorMessage, setMaxAmountCollateral]);

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
    refreshSimulation,
  };
}
