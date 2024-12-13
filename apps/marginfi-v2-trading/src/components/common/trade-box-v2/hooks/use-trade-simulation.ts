import {
  computeMaxLeverage,
  MarginfiAccountWrapper,
  MarginfiClient,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { SolanaTransaction } from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  DYNAMIC_SIMULATION_ERRORS,
  extractErrorString,
  LoopActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import React from "react";
import { calculateLooping } from "~/components/action-box-v2/actions/loop-box/utils/loop-action.utils";
import { SimulationStatus } from "~/components/action-box-v2/utils";
import { ArenaBank, ArenaPoolV2Extended } from "~/store/tradeStoreV2";
import { calculateSummary, getSimulationResult } from "../utils";
import BigNumber from "bignumber.js";

export type TradeSimulationProps = {
  debouncedAmount: number;
  debouncedLeverage: number;
  selectedBank: ArenaBank | null;
  selectedSecondaryBank: ArenaBank | null;
  marginfiClient: MarginfiClient | null;
  actionTxns: LoopActionTxns;
  simulationResult: SimulationResult | null;
  wrappedAccount: MarginfiAccountWrapper | null;
  accountSummary?: AccountSummary;
  isEnabled: boolean;

  slippageBps: number;
  platformFeeBps: number;

  setActionTxns: (actionTxns: LoopActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
  setSimulationResult: (result: SimulationResult | null) => void;
  setMaxLeverage: (maxLeverage: number) => void;
};

export function useTradeSimulation({
  debouncedAmount,
  debouncedLeverage,
  selectedBank,
  selectedSecondaryBank,
  marginfiClient,
  wrappedAccount,
  actionTxns,
  simulationResult,
  slippageBps,
  platformFeeBps,
  accountSummary,
  isEnabled,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
  setSimulationResult,
  setMaxLeverage,
}: TradeSimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevDebouncedLeverage = usePrevious(debouncedLeverage);
  const prevSelectedSecondaryBank = usePrevious(selectedSecondaryBank);

  const handleSimulation = React.useCallback(
    async (txns: (VersionedTransaction | Transaction)[]) => {
      try {
        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });
        if (wrappedAccount && selectedBank && txns.length > 0) {
          const simulationResult = await getSimulationResult({
            account: wrappedAccount,
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
    [selectedBank, wrappedAccount, setErrorMessage, setIsLoading, setSimulationResult]
  );

  const handleActionSummary = React.useCallback(
    (summary?: AccountSummary, result?: SimulationResult) => {
      if (wrappedAccount && summary && selectedBank && actionTxns) {
        return calculateSummary({
          simulationResult: result ?? undefined,
          bank: selectedBank,
          accountSummary: summary,
          actionTxns: actionTxns,
        });
      }
    },
    [selectedBank, wrappedAccount, actionTxns]
  );

  const fetchTradeTxns = React.useCallback(
    async (amount: number, leverage: number) => {
      if (amount === 0 || leverage === 0 || !selectedBank || !selectedSecondaryBank || !marginfiClient) {
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

      setIsLoading({ isLoading: true, status: SimulationStatus.PREPARING });

      try {
        const loopingResult = await calculateLooping({
          marginfiClient: marginfiClient,
          marginfiAccount: wrappedAccount,
          depositBank: selectedBank,
          borrowBank: selectedSecondaryBank,
          targetLeverage: leverage,
          depositAmount: amount,
          slippageBps: slippageBps,
          connection: marginfiClient?.provider.connection,
          platformFeeBps: platformFeeBps,
        });

        if (loopingResult && "actionQuote" in loopingResult) {
          setActionTxns(loopingResult);
        } else {
          const errorMessage =
            loopingResult ??
            DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(selectedSecondaryBank.meta.tokenSymbol);
          // TODO: update

          setErrorMessage(errorMessage);
          console.error("Error building looping transaction: ", errorMessage.description);
          setIsLoading({ isLoading: false, status: SimulationStatus.IDLE });
        }
      } catch (error) {
        console.error("Error building looping transaction:", error);
        setErrorMessage(STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED); // TODO: update
        setIsLoading({ isLoading: false, status: SimulationStatus.IDLE });
      }
    },
    [
      selectedBank,
      selectedSecondaryBank,
      marginfiClient,
      wrappedAccount,
      slippageBps,
      platformFeeBps,
      setErrorMessage,
      setIsLoading,
      setActionTxns,
      setSimulationResult,
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
    // console.log("isEnabled", isEnabled);
    if (prevDebouncedAmount !== debouncedAmount || prevDebouncedLeverage !== debouncedLeverage) {
      // Only set to PREPARING if we're actually going to simulate
      if (debouncedAmount > 0 && debouncedLeverage > 0) {
        fetchTradeTxns(debouncedAmount, debouncedLeverage);
      }
    }
  }, [debouncedAmount, debouncedLeverage, fetchTradeTxns, prevDebouncedAmount, prevDebouncedLeverage, isEnabled]);

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

  // Fetch max leverage based when the secondary bank changes
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
    await fetchTradeTxns(debouncedAmount ?? 0, debouncedLeverage ?? 0);
  }, [fetchTradeTxns, debouncedAmount, debouncedLeverage]);

  return { actionSummary, refreshSimulation };
}
