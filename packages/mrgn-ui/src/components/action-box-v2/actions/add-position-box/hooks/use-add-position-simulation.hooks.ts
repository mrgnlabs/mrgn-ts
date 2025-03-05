import React from "react";
import BigNumber from "bignumber.js";

import {
  computeMaxLeverage,
  MarginfiAccountWrapper,
  MarginfiClient,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  ActionProcessingError,
  ActionTxns,
  CalculateTradingProps,
  DYNAMIC_SIMULATION_ERRORS,
  extractErrorString,
  JupiterOptions,
  LoopActionTxns,
  STATIC_SIMULATION_ERRORS,
  TradeActionTxns,
  usePrevious,
  TradeSide,
} from "@mrgnlabs/mrgn-utils";
import { AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "~/components/action-box-v2/store";
import { SimulationStatus } from "~/components/action-box-v2/utils";

import { calculateSummary, generateAddPositionTxns, getSimulationResult } from "../utils";

type AddPositionSimulationProps = {
  depositBank: ExtendedBankInfo | null;
  borrowBank: ExtendedBankInfo | null;
  tradeSide: TradeSide;

  debouncedAmount: number;
  debouncedLeverage: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  jupiterOptions: JupiterOptions | null;
  platformFeeBps: number;

  setActionTxns: (actionTxns: TradeActionTxns) => void;
  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setMaxLeverage: (maxLeverage: number) => void;
};

export function useAddPositionSimulation({
  debouncedAmount,
  debouncedLeverage,
  selectedAccount,
  marginfiClient,
  depositBank,
  borrowBank,
  jupiterOptions,
  platformFeeBps,
  tradeSide,

  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setIsLoading,
  setMaxLeverage,
}: AddPositionSimulationProps) {
  const prevDebouncedAmount = usePrevious(debouncedAmount);
  const prevDebouncedLeverage = usePrevious(debouncedLeverage);
  const prevBorrowBank = usePrevious(borrowBank);

  ///////////////////////
  // Handle simulation //
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
      transactions: [],
      actionQuote: null,
      actualDepositAmount: 0,
      borrowAmount: new BigNumber(0),
    });
    console.error(
      "Error simulating transaction",
      typeof actionMessage === "string" ? extractErrorString(actionMessage) : actionMessage.description
    );
    callbacks.setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
  };

  const handleSimulation = React.useCallback(
    async (amount: number, leverage: number) => {
      try {
        if (
          !selectedAccount ||
          !marginfiClient ||
          !depositBank ||
          !borrowBank ||
          amount === 0 ||
          leverage === 0 ||
          !jupiterOptions
        ) {
          setActionTxns({
            transactions: [],
            actionQuote: null,
            actualDepositAmount: 0,
            borrowAmount: new BigNumber(0),
          });
          setSimulationResult(null);
          return;
        }

        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

        const props: CalculateTradingProps = {
          marginfiClient: marginfiClient,
          marginfiAccount: selectedAccount,
          depositBank: depositBank,
          borrowBank: borrowBank,
          targetLeverage: leverage,
          depositAmount: amount,
          slippageBps: jupiterOptions.slippageBps,
          slippageMode: jupiterOptions.slippageMode,
          platformFeeBps: platformFeeBps,
          tradeState: tradeSide === TradeSide.LONG ? "long" : "short",
          connection: marginfiClient.provider.connection,
        };

        const actionTxns = await generateAddPositionTxns(props);

        if (!actionTxns.marginfiAccount) {
          throw new Error("throw");
        }

        const simulationResult = await getSimulationResult({
          txns: actionTxns.transactions,
          account: actionTxns.marginfiAccount,
          bank: depositBank,
        });

        setActionTxns(actionTxns);
        setSimulationResult(simulationResult);
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
      borrowBank,
      depositBank,
      jupiterOptions,
      marginfiClient,
      platformFeeBps,
      selectedAccount,
      setActionTxns,
      setErrorMessage,
      setIsLoading,
      setSimulationResult,
      tradeSide,
    ]
  );

  React.useEffect(() => {
    if (prevDebouncedAmount !== debouncedAmount || prevDebouncedLeverage !== debouncedLeverage) {
      handleSimulation(debouncedAmount, debouncedLeverage);
    }
  }, [debouncedAmount, debouncedLeverage, handleSimulation, prevDebouncedAmount, prevDebouncedLeverage]);
  ///////////////////////

  ///////////////////////
  // Fetch max repayable collateral and max leverage based when the secondary bank changes
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

  // Fetch max leverage based when the secondary bank changes
  React.useEffect(() => {
    if (borrowBank && prevBorrowBank?.address !== borrowBank.address) {
      fetchMaxLeverage();
    }
  }, [borrowBank, prevBorrowBank, fetchMaxLeverage]);

  ///////////////////////

  ///////////////////////
  // Refresh simulation
  const refreshSimulation = React.useCallback(async () => {
    if (debouncedAmount > 0) {
      await handleSimulation(debouncedAmount, debouncedLeverage);
    }
  }, [handleSimulation, debouncedAmount, debouncedLeverage]);
  ///////////////////////

  return {
    refreshSimulation,
  };
}
