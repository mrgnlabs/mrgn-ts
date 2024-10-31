import React from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import {
  computeMaxLeverage,
  MarginfiAccountWrapper,
  MarginfiClient,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMethod,
  DYNAMIC_SIMULATION_ERRORS,
  LoopActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { TransactionBroadcastType } from "@mrgnlabs/mrgn-common";
import { AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "../../../store";
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
  priorityFee: number;
  broadcastType: TransactionBroadcastType;

  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: LoopActionTxns) => void;
  setErrorMessage: (error: ActionMethod) => void;
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
  priorityFee,
  broadcastType,

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

  const handleSimulation = React.useCallback(
    async (txns: (VersionedTransaction | Transaction)[]) => {
      try {
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

      console.log("simulating");

      setIsLoading(true);
      try {
        const loopingObject = await calculateLooping(
          selectedAccount,
          selectedBank,
          selectedSecondaryBank,
          leverage,
          amount,
          slippageBps,
          marginfiClient.provider.connection,
          priorityFee,
          platformFeeBps,
          broadcastType
        );

        if (loopingObject && "loopingTxn" in loopingObject) {
          const actionTxns = {
            actionTxn: loopingObject.loopingTxn,
            additionalTxns: loopingObject.feedCrankTxs,
            actionQuote: loopingObject.quote,
            actualDepositAmount: loopingObject.actualDepositAmount,
            borrowAmount: loopingObject.borrowAmount,
          };

          setActionTxns(actionTxns);
        } else {
          const errorMessage =
            loopingObject ??
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
      priorityFee,
      platformFeeBps,
      broadcastType,
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
    handleSimulation([
      ...(actionTxns?.additionalTxns ?? []),
      ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
    ]);
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

  return {
    actionSummary,
  };
}
