import React from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { QuoteResponse } from "@jup-ag/api";

import {
  computeMaxLeverage,
  MarginfiAccountWrapper,
  MarginfiClient,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMethod,
  calculateMaxRepayableCollateral,
  DYNAMIC_SIMULATION_ERRORS,
  LoopActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "../../../store";
import { calculateLooping, calculateSummary, getSimulationResult } from "../utils";
import BigNumber from "bignumber.js";

type LoopSimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  accountSummary?: AccountSummary;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  actionTxns: LoopActionTxns;
  simulationResult: SimulationResult | null;
  isRefreshTxn: boolean;
  leverage: number;

  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: LoopActionTxns) => void;
  setErrorMessage: (error: ActionMethod) => void;
  setIsLoading: (isLoading: boolean) => void;
  setMaxLeverage: (maxLeverage: number) => void;
};

export function useLoopSimulation({
  debouncedAmount,
  selectedAccount,
  marginfiClient,
  accountSummary,
  selectedBank,
  selectedSecondaryBank,
  actionTxns,
  simulationResult,
  isRefreshTxn,
  leverage,

  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
  setMaxLeverage,
}: LoopSimulationProps) {
  const [slippageBps, priorityFee] = useActionBoxStore((state) => [state.slippageBps, state.priorityFee]);

  const prevDebouncedAmount = usePrevious(debouncedAmount);
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
    [selectedAccount, selectedBank, setSimulationResult]
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
    async (amount: number) => {
      if (!selectedAccount || !marginfiClient || !selectedBank || !selectedSecondaryBank || amount === 0) {
        const missingParams = [];
        if (!selectedAccount) missingParams.push("account is null");
        if (amount === 0) missingParams.push("amount is 0");
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
          priorityFee
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
        setErrorMessage(STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED);
      } finally {
        setIsLoading(false);
      }
    },
    [
      leverage,
      selectedBank,
      selectedSecondaryBank,
      selectedAccount,
      setIsLoading,
      slippageBps,
      marginfiClient,
      priorityFee,
      setActionTxns,
      setErrorMessage,
    ]
  );

  const fetchMaxLeverage = React.useCallback(async () => {
    if (selectedBank && selectedSecondaryBank) {
      setIsLoading(true);
      const { maxLeverage, ltv } = computeMaxLeverage(selectedBank.info.rawBank, selectedSecondaryBank.info.rawBank);
      const maxAmount = await calculateMaxRepayableCollateral(selectedBank, selectedSecondaryBank, slippageBps);

      if (!maxAmount) {
        const errorMessage = DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(
          selectedSecondaryBank.meta.tokenSymbol
        );

        setErrorMessage(errorMessage);
      } else {
        setMaxLeverage(maxAmount);
      }
    }
  }, [selectedBank, selectedSecondaryBank, slippageBps, setIsLoading, setErrorMessage, setMaxLeverage]);

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
    // only simulate when amount changes
    if (prevDebouncedAmount !== debouncedAmount) {
      fetchLoopingTxn(debouncedAmount ?? 0);
    }

    if (isRefreshTxn) {
      fetchLoopingTxn(debouncedAmount ?? 0);
    }
  }, [prevDebouncedAmount, isRefreshTxn, debouncedAmount, fetchLoopingTxn]);

  React.useEffect(() => {
    handleSimulation([
      ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
      ...(actionTxns?.additionalTxns ?? []),
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
