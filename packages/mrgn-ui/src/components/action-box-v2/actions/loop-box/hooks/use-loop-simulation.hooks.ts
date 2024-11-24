import React from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import {
  computeMaxLeverage,
  MarginfiAccountWrapper,
  MarginfiClient,
  PriorityFees,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  DYNAMIC_SIMULATION_ERRORS,
  LoopActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { TransactionBroadcastType } from "@mrgnlabs/mrgn-common";
import { AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "../../../store";
import { SimulationStatus } from "../../../utils/simulation.utils";
import { calculateLooping, calculateSummary, getSimulationResult } from "../utils";

type LoopSimulationProps = {
  debouncedAmount: number;
  debouncedLeverage: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  accountSummary?: AccountSummary;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  actionTxns: LoopActionTxns;
  simulationResult: SimulationResult | null;
  isRefreshTxn: boolean;

  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: LoopActionTxns) => void;
  setErrorMessage: (error: ActionMessageType) => void;
  setIsLoading: (isLoading: boolean) => void;
  setMaxLeverage: (maxLeverage: number) => void;
};

export function useLoopSimulation({
  debouncedAmount,
  debouncedLeverage,
  selectedAccount,
  marginfiClient,
  accountSummary,
  selectedBank,
  selectedSecondaryBank,
  actionTxns,
  simulationResult,
  isRefreshTxn,

  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
  setMaxLeverage,
}: LoopSimulationProps) {
  const [slippageBps, platformFeeBps] = useActionBoxStore((state) => [state.slippageBps, state.platformFeeBps]);

  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevDebouncedLeverage = usePrevious(debouncedLeverage);
  const prevSelectedSecondaryBank = usePrevious(selectedSecondaryBank);
  const prevActionTxn = usePrevious(actionTxns?.actionTxn);

  const [simulationStatus, setSimulationStatus] = React.useState<SimulationStatus>(SimulationStatus.IDLE);

  const handleSimulation = React.useCallback(
    async (txns: (VersionedTransaction | Transaction)[]) => {
      try {
        setSimulationStatus(SimulationStatus.SIMULATING);
        if (selectedAccount && selectedBank && txns.length > 0) {
          const simulationResult = await getSimulationResult({
            account: selectedAccount,
            bank: selectedBank,
            txns,
          });

          setSimulationResult(simulationResult.simulationResult);
        } else {
          setSimulationResult(null);
        }
      } catch (error) {
        console.error("Error simulating transaction", error);
        setSimulationResult(null);
      } finally {
        setIsLoading(false);
        setSimulationStatus(SimulationStatus.COMPLETE);
      }
    },
    [selectedAccount, selectedBank, setIsLoading, setSimulationResult]
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

  const fetchLoopingTxn = React.useCallback(
    async (amount: number, leverage: number) => {
      setSimulationStatus(SimulationStatus.PREPARING);
      if (
        !selectedAccount ||
        !marginfiClient ||
        !selectedBank ||
        !selectedSecondaryBank ||
        amount === 0 ||
        leverage === 0
      ) {
        const missingParams = [];
        if (!selectedAccount) missingParams.push("account is null");
        if (amount === 0) missingParams.push("amount is 0");
        if (leverage === 0) missingParams.push("leverage is 0");
        if (!selectedBank) missingParams.push("bank is null");
        // console.error(`Can't simulate transaction: ${missingParams.join(", ")}`);

        setActionTxns({
          actionTxn: null,
          additionalTxns: [],
          actionQuote: null,
          lastValidBlockHeight: undefined,
          actualDepositAmount: 0,
          borrowAmount: new BigNumber(0),
        });
        setSimulationResult(null);
        return;
      }

      setIsLoading(true);
      try {
        const loopingResult = await calculateLooping({
          marginfiClient,
          marginfiAccount: selectedAccount,
          depositBank: selectedBank,
          borrowBank: selectedSecondaryBank,
          targetLeverage: leverage,
          depositAmount: amount,
          slippageBps,
          connection: marginfiClient.provider.connection,
          platformFeeBps,
        });

        if (loopingResult && "actionQuote" in loopingResult) {
          setActionTxns(loopingResult);
        } else {
          const errorMessage =
            loopingResult ??
            DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(selectedSecondaryBank.meta.tokenSymbol);

          setErrorMessage(errorMessage);
        }
      } catch (error) {
        console.error({ error });
        setErrorMessage(STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED);
      } finally {
        setIsLoading(false);
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
      slippageBps,
      platformFeeBps,
      setErrorMessage,
    ]
  );

  const fetchMaxLeverage = React.useCallback(async () => {
    if (selectedBank && selectedSecondaryBank) {
      const { maxLeverage, ltv } = computeMaxLeverage(selectedBank.info.rawBank, selectedSecondaryBank.info.rawBank);

      if (!maxLeverage) {
        const errorMessage = DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(
          selectedSecondaryBank.meta.tokenSymbol
        );

        console.log("fetchMaxLeverage", errorMessage);
        setErrorMessage(errorMessage);
      } else {
        setMaxLeverage(maxLeverage);
      }
    }
  }, [selectedBank, selectedSecondaryBank, setErrorMessage, setMaxLeverage]);

  console.log("simulationStatus", simulationStatus);

  React.useEffect(() => {
    if (isRefreshTxn) {
      setActionTxns({
        actionTxn: null,
        additionalTxns: [],
        actionQuote: null,
        lastValidBlockHeight: undefined,
        actualDepositAmount: 0,
        borrowAmount: new BigNumber(0),
      });
      setSimulationResult(null);
    }
  }, [isRefreshTxn]);

  React.useEffect(() => {
    // only simulate when amount or leverage changes
    if (prevDebouncedAmount !== debouncedAmount || prevDebouncedLeverage !== debouncedLeverage) {
      fetchLoopingTxn(debouncedAmount, debouncedLeverage);
    }

    // manually trigger simulation when refresh txn is true
    if (isRefreshTxn) {
      fetchLoopingTxn(debouncedAmount, debouncedLeverage);
    }
  }, [prevDebouncedAmount, isRefreshTxn, debouncedAmount, debouncedLeverage, fetchLoopingTxn, prevDebouncedLeverage]);

  React.useEffect(() => {
    // Only run simulation if we have transactions to simulate
    if (actionTxns?.actionTxn || (actionTxns?.additionalTxns?.length ?? 0) > 0) {
      handleSimulation([
        ...(actionTxns?.additionalTxns ?? []),
        ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
      ]);
    } else {
      // If no transactions, move back to idle state
      setSimulationStatus(SimulationStatus.IDLE);
      setIsLoading(false);
    }
  }, [actionTxns]);

  // Fetch max repayable collateral or max leverage based when the secondary bank changes
  React.useEffect(() => {
    if (!selectedSecondaryBank) {
      return;
    }
    const hasBankChanged = !prevSelectedSecondaryBank?.address.equals(selectedSecondaryBank.address);
    if (hasBankChanged) {
      fetchMaxLeverage();
    }
  }, [selectedSecondaryBank, prevSelectedSecondaryBank, fetchMaxLeverage]);

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  const refreshSimulation = React.useCallback(async () => {
    await fetchLoopingTxn(debouncedAmount ?? 0, debouncedLeverage ?? 0);
  }, [fetchLoopingTxn, debouncedAmount, debouncedLeverage]);

  return {
    actionSummary,
    refreshSimulation,
    simulationStatus,
  };
}
