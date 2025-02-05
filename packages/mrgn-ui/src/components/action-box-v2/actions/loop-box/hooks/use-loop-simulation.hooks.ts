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
import { AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "../../../store";
import { SimulationStatus } from "../../../utils/simulation.utils";
import { calculateLooping, calculateSummary, getSimulationResult } from "../utils";
import { JupiterOptions } from "~/components/settings/settings";

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
  jupiterOptions: JupiterOptions | null;

  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: LoopActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setMaxLeverage: (maxLeverage: number) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
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
  jupiterOptions,

  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
  setMaxLeverage,
}: LoopSimulationProps) {
  const [platformFeeBps] = useActionBoxStore((state) => [state.platformFeeBps]);

  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevDebouncedLeverage = usePrevious(debouncedLeverage);
  const prevSelectedSecondaryBank = usePrevious(selectedSecondaryBank);
  const prevActionTxn = usePrevious(actionTxns?.transactions);

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
        console.error("Error simulating transaction", error);
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

  const fetchLoopingTxn = React.useCallback(
    async (amount: number, leverage: number) => {
      if (
        !selectedAccount ||
        !marginfiClient ||
        !selectedBank ||
        !selectedSecondaryBank ||
        amount === 0 ||
        leverage === 0 ||
        !jupiterOptions
      ) {
        const missingParams = [];
        if (!selectedAccount) missingParams.push("account is null");
        if (amount === 0) missingParams.push("amount is 0");
        if (leverage === 0) missingParams.push("leverage is 0");
        if (!selectedBank) missingParams.push("bank is null");
        // console.error(`Can't simulate transaction: ${missingParams.join(", ")}`);

        setActionTxns({
          transactions: [],
          actionQuote: null,
          lastValidBlockHeight: undefined,
          actualDepositAmount: 0,
          borrowAmount: new BigNumber(0),
        });
        setSimulationResult(null);
        return;
      }

      setIsLoading({ isLoading: true, status: SimulationStatus.PREPARING });

      try {
        const loopingResult = await calculateLooping({
          marginfiClient,
          marginfiAccount: selectedAccount,
          depositBank: selectedBank,
          borrowBank: selectedSecondaryBank,
          targetLeverage: leverage,
          depositAmount: amount,
          slippageBps: jupiterOptions?.slippageBps,
          slippageMode: jupiterOptions?.slippageMode,
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
          console.error("Error building looping transaction: ", errorMessage.description);
          setIsLoading({ isLoading: false, status: SimulationStatus.IDLE });
        }
      } catch (error) {
        console.error("Error building looping transaction:", error);
        setErrorMessage(STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED);
        setIsLoading({ isLoading: false, status: SimulationStatus.IDLE });
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
        setErrorMessage(errorMessage);
      } else {
        setMaxLeverage(maxLeverage);
      }
    }
  }, [selectedBank, selectedSecondaryBank, setErrorMessage, setMaxLeverage]);

  React.useEffect(() => {
    if (isRefreshTxn) {
      setActionTxns({
        transactions: [],
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
    if (actionTxns?.transactions?.length ?? 0 > 0) {
      handleSimulation([...(actionTxns?.transactions ?? [])]);
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
  };
}
