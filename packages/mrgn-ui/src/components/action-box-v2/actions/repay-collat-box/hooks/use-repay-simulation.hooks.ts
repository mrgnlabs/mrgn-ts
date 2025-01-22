import React from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  calculateMaxRepayableCollateral,
  DYNAMIC_SIMULATION_ERRORS,
  RepayCollatActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { TransactionBroadcastType } from "@mrgnlabs/mrgn-common";
import { AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

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
  const prevSelectedSecondaryBank = usePrevious(selectedSecondaryBank);
  const prevActionTxn = usePrevious(actionTxns?.actionTxn);

  const handleSimulation = React.useCallback(
    async (txns: (VersionedTransaction | Transaction)[]) => {
      try {
        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });
        if (selectedAccount && selectedBank && txns.length > 0) {
          const simulationResult = await getSimulationResult({
            account: selectedAccount,
            bank: selectedBank,
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
    [selectedAccount, selectedBank, setErrorMessage, setIsLoading, setSimulationResult]
  );

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

  const fetchRepayTxn = React.useCallback(
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

        setActionTxns({ actionTxn: null, additionalTxns: [], actionQuote: null, lastValidBlockHeight: undefined });
        setSimulationResult(null);
        return;
      }

      setIsLoading({ isLoading: true, status: SimulationStatus.PREPARING });

      try {
        const repayResult = await calculateRepayCollateral({
          marginfiAccount: selectedAccount,
          borrowBank: selectedBank,
          depositBank: selectedSecondaryBank,
          withdrawAmount: amount,
          connection: marginfiClient.provider.connection,
          platformFeeBps,
          slippageBps: jupiterOptions?.slippageBps,
          slippageMode: jupiterOptions?.slippageMode,
        });

        if (repayResult && "repayCollatObject" in repayResult) {
          setRepayAmount(repayResult.amount);
          setActionTxns(repayResult.repayCollatObject);
        } else {
          const errorMessage =
            repayResult ?? DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(selectedSecondaryBank.meta.tokenSymbol);
          setErrorMessage(errorMessage);
          setIsLoading({ isLoading: false, status: SimulationStatus.IDLE });
        }
      } catch (error) {
        setIsLoading({ isLoading: false, status: SimulationStatus.IDLE });
        setErrorMessage(STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED);
      }
    },
    [
      selectedAccount,
      marginfiClient,
      selectedBank,
      selectedSecondaryBank,
      setIsLoading,
      setActionTxns,
      setSimulationResult,
      jupiterOptions,
      platformFeeBps,
      setRepayAmount,
      setErrorMessage,
    ]
  );

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

  const refreshSimulation = React.useCallback(async () => {
    await fetchRepayTxn(debouncedAmount ?? 0);
  }, [fetchRepayTxn, debouncedAmount]);

  React.useEffect(() => {
    if (isRefreshTxn) {
      setActionTxns({ actionTxn: null, additionalTxns: [], actionQuote: null, lastValidBlockHeight: undefined });
      setSimulationResult(null);
    }
  }, [isRefreshTxn]);

  React.useEffect(() => {
    // Reset simulation status when amount changes
    // only simulate when amount changes
    if (prevDebouncedAmount !== debouncedAmount) {
      fetchRepayTxn(debouncedAmount ?? 0);
    }

    if (isRefreshTxn) {
      fetchRepayTxn(debouncedAmount ?? 0);
    }
  }, [prevDebouncedAmount, isRefreshTxn, debouncedAmount, fetchRepayTxn]);

  React.useEffect(() => {
    // Only run simulation if we have transactions to simulate
    if (actionTxns?.actionTxn || (actionTxns?.additionalTxns?.length ?? 0) > 0) {
      handleSimulation([
        ...(actionTxns?.additionalTxns ?? []),
        ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
      ]);
    } else {
      // If no transactions, move back to idle state
      setIsLoading({ isLoading: false, status: SimulationStatus.IDLE });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionTxns]);

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

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  return {
    actionSummary,
    refreshSimulation,
  };
}
