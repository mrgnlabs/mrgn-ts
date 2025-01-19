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
  ActionMessageType,
  CalculateLoopingProps,
  DYNAMIC_SIMULATION_ERRORS,
  extractErrorString,
  TradeActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";

import { SimulationStatus } from "~/components/action-box-v2/utils";
import { ArenaBank } from "~/types/trade-store.types";
import { generateTradeTx, getSimulationResult } from "../utils";

export type TradeSimulationProps = {
  debouncedAmount: number;
  debouncedLeverage: number;
  depositBank: ArenaBank | null;
  borrowBank: ArenaBank | null;
  marginfiClient: MarginfiClient | null;
  wrappedAccount: MarginfiAccountWrapper | null;
  isEnabled: boolean;

  slippageBps: number;
  platformFeeBps: number;

  tradeState: "long" | "short";

  setActionTxns: (actionTxns: TradeActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
  setSimulationResult: (result: SimulationResult | null) => void;
  setMaxLeverage: (maxLeverage: number) => void;
};

export function useTradeSimulation({
  debouncedAmount,
  debouncedLeverage,
  depositBank,
  borrowBank,
  marginfiClient,
  wrappedAccount,
  slippageBps,
  platformFeeBps,
  isEnabled,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
  setSimulationResult,
  setMaxLeverage,
  tradeState,
}: TradeSimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevDebouncedLeverage = usePrevious(debouncedLeverage);
  const prevBorrowBank = usePrevious(borrowBank);

  const handleError = (
    actionMessage: ActionMessageType | string,
    callbacks: {
      setErrorMessage: (error: ActionMessageType | null) => void;
      setSimulationResult: (result: SimulationResult | null) => void;
      setActionTxns: (actionTxns: TradeActionTxns) => void;
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
    callbacks.setActionTxns({
      actionTxn: null,
      additionalTxns: [],
      actionQuote: null,
      lastValidBlockHeight: undefined,
      actualDepositAmount: 0,
      borrowAmount: new BigNumber(0),
    });
    console.error(
      "Error simulating transaction",
      typeof actionMessage === "string" ? extractErrorString(actionMessage) : actionMessage.description
    );
    callbacks.setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
  };

  const simulationAction = async (props: {
    account: MarginfiAccountWrapper;
    bank: ArenaBank;
    txns: (VersionedTransaction | Transaction)[];
  }): Promise<{
    simulationResult: SimulationResult | null;
    actionMessage: ActionMessageType | null;
  }> => {
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

  const fetchTradeTxnsAction = async (
    props: CalculateLoopingProps
  ): Promise<{ actionTxns: TradeActionTxns | null; actionMessage: ActionMessageType | null }> => {
    try {
      console.log("fetching trade txns, props", props);
      const tradingResult = await generateTradeTx({
        ...props,
      });

      console.log("tradingResult", tradingResult);

      if (tradingResult && "actionQuote" in tradingResult) {
        return { actionTxns: tradingResult, actionMessage: null };
      } else {
        const errorMessage = tradingResult ?? DYNAMIC_SIMULATION_ERRORS.TRADE_FAILED_CHECK();
        return { actionTxns: null, actionMessage: errorMessage };
      }
    } catch (error) {
      return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.TRADE_FAILED };
    }
  };

  const handleSimulation = React.useCallback(
    async (amount: number, leverage: number) => {
      try {
        if (amount === 0 || leverage === 0 || !depositBank || !borrowBank || !marginfiClient) {
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
        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

        const tradeActionTxns = await fetchTradeTxnsAction({
          marginfiClient: marginfiClient,
          marginfiAccount: wrappedAccount,
          depositBank: depositBank,
          borrowBank: borrowBank,
          targetLeverage: leverage,
          depositAmount: amount,
          slippageBps: slippageBps,
          connection: marginfiClient?.provider.connection,
          platformFeeBps: platformFeeBps,
          tradeState,
        });

        if (tradeActionTxns.actionMessage || tradeActionTxns.actionTxns === null) {
          handleError(tradeActionTxns.actionMessage ?? STATIC_SIMULATION_ERRORS.TRADE_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        }

        const finalAccount = tradeActionTxns?.actionTxns.marginfiAccount || wrappedAccount;

        if (!finalAccount) {
          throw new Error("Marginfi account is null");
        }

        const simulationResult = await simulationAction({
          account: finalAccount,
          bank: depositBank,
          txns: [
            ...(tradeActionTxns?.actionTxns?.additionalTxns ?? []),
            ...(tradeActionTxns?.actionTxns?.actionTxn ? [tradeActionTxns?.actionTxns?.actionTxn] : []),
          ],
        });

        if (simulationResult.actionMessage || simulationResult.simulationResult === null) {
          handleError(simulationResult.actionMessage ?? STATIC_SIMULATION_ERRORS.TRADE_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        } else if (simulationResult.simulationResult) {
          setSimulationResult(simulationResult.simulationResult);
          setActionTxns(tradeActionTxns.actionTxns);
        } else {
          throw new Error("Unknown error");
        }
      } catch (error) {
        console.error("Error simulating transaction", error);
        setSimulationResult(null);
        setActionTxns({
          actionTxn: null,
          additionalTxns: [],
          actionQuote: null,
          lastValidBlockHeight: undefined,
          actualDepositAmount: 0,
          borrowAmount: new BigNumber(0),
        });
      } finally {
        setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
      }
    },
    [
      depositBank,
      borrowBank,
      marginfiClient,
      setIsLoading,
      wrappedAccount,
      slippageBps,
      platformFeeBps,
      setActionTxns,
      setSimulationResult,
      setErrorMessage,
    ]
  );

  const fetchMaxLeverage = React.useCallback(async () => {
    if (depositBank && borrowBank) {
      const { maxLeverage, ltv } = computeMaxLeverage(depositBank.info.rawBank, borrowBank.info.rawBank);

      if (!maxLeverage) {
        const errorMessage = DYNAMIC_SIMULATION_ERRORS.TRADE_FAILED_CHECK();
        setErrorMessage(errorMessage);
      } else {
        setMaxLeverage(maxLeverage);
      }
    }
  }, [depositBank, borrowBank, setErrorMessage, setMaxLeverage]);

  React.useEffect(() => {
    if ((prevDebouncedAmount !== debouncedAmount || prevDebouncedLeverage !== debouncedLeverage) && isEnabled) {
      // Only set to PREPARING if we're actually going to simulate
      if (debouncedAmount > 0 && debouncedLeverage > 0) {
        handleSimulation(debouncedAmount, debouncedLeverage);
      }
    }
  }, [debouncedAmount, debouncedLeverage, handleSimulation, isEnabled, prevDebouncedAmount, prevDebouncedLeverage]);

  // Fetch max leverage based when the secondary bank changes
  React.useEffect(() => {
    if (borrowBank && prevBorrowBank?.address !== borrowBank.address) {
      fetchMaxLeverage();
    }
  }, [borrowBank, prevBorrowBank, fetchMaxLeverage]);

  const refreshSimulation = React.useCallback(async () => {
    await handleSimulation(debouncedAmount ?? 0, debouncedLeverage ?? 0);
  }, [handleSimulation, debouncedAmount, debouncedLeverage]);

  return { refreshSimulation };
}
