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
  CalculateLoopingProps,
  DYNAMIC_SIMULATION_ERRORS,
  extractErrorString,
  TradeActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import React from "react";
import { calculateLooping } from "~/components/action-box-v2/actions/loop-box/utils/loop-action.utils";
import { SimulationStatus } from "~/components/action-box-v2/utils";
import { ArenaBank, ArenaPoolV2Extended } from "~/store/tradeStoreV2";
import { calculateSummary, generateTradeTx, getSimulationResult } from "../utils";
import BigNumber from "bignumber.js";

export type TradeSimulationProps = {
  debouncedAmount: number;
  debouncedLeverage: number;
  selectedBank: ArenaBank | null;
  selectedSecondaryBank: ArenaBank | null;
  marginfiClient: MarginfiClient | null;
  actionTxns: TradeActionTxns;
  simulationResult: SimulationResult | null;
  wrappedAccount: MarginfiAccountWrapper | null;
  accountSummary?: AccountSummary;
  isEnabled: boolean;

  slippageBps: number;
  platformFeeBps: number;

  setActionTxns: (actionTxns: TradeActionTxns) => void;
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

      if (simulationResult.actionMethod) {
        return { simulationResult: null, actionMessage: simulationResult.actionMethod };
      } else if (simulationResult.simulationResult) {
        return { simulationResult: simulationResult.simulationResult, actionMessage: null };
      } else {
        const errorMessage = DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(props.bank.meta.tokenSymbol); // TODO: update
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
      const loopingResult = await generateTradeTx({
        ...props,
        authority: props.marginfiAccount?.authority ?? props.marginfiClient.provider.publicKey,
      });

      if (loopingResult && "actionQuote" in loopingResult) {
        return { actionTxns: loopingResult, actionMessage: null };
      } else {
        const errorMessage =
          loopingResult ?? DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(props.borrowBank.meta.tokenSymbol);
        // TODO: update
        return { actionTxns: null, actionMessage: errorMessage };
      }
    } catch (error) {
      return { actionTxns: null, actionMessage: STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED }; // TODO: update
    }
  };

  const handleSimulation = React.useCallback(
    async (amount: number, leverage: number) => {
      try {
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
        setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

        const tradeActionTxns = await fetchTradeTxnsAction({
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

        if (tradeActionTxns.actionMessage || tradeActionTxns.actionTxns === null) {
          handleError(tradeActionTxns.actionMessage ?? STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED, {
            // TODO: update error message
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        }

        if (tradeActionTxns.actionTxns.accountCreationTx) {
          setActionTxns(tradeActionTxns.actionTxns);
          return;
        }

        if (!wrappedAccount) {
          throw new Error("Marginfi account is null");
        }

        const simulationResult = await simulationAction({
          account: wrappedAccount,
          bank: selectedBank,
          txns: [
            ...(tradeActionTxns?.actionTxns?.additionalTxns ?? []),
            ...(tradeActionTxns?.actionTxns?.actionTxn ? [tradeActionTxns?.actionTxns?.actionTxn] : []),
          ],
        });

        if (simulationResult.actionMessage || simulationResult.simulationResult === null) {
          handleError(simulationResult.actionMessage ?? STATIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED, {
            // TODO: update
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
      selectedBank,
      selectedSecondaryBank,
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
    if ((prevDebouncedAmount !== debouncedAmount || prevDebouncedLeverage !== debouncedLeverage) && isEnabled) {
      // Only set to PREPARING if we're actually going to simulate
      if (debouncedAmount > 0 && debouncedLeverage > 0) {
        handleSimulation(debouncedAmount, debouncedLeverage);
      }
    }
  }, [debouncedAmount, debouncedLeverage, handleSimulation, isEnabled, prevDebouncedAmount, prevDebouncedLeverage]);

  // Fetch max leverage based when the secondary bank changes
  React.useEffect(() => {
    if (selectedSecondaryBank && prevSelectedSecondaryBank?.address !== selectedSecondaryBank.address) {
      fetchMaxLeverage();
    }
  }, [selectedSecondaryBank, prevSelectedSecondaryBank, fetchMaxLeverage]);

  const refreshSimulation = React.useCallback(async () => {
    await handleSimulation(debouncedAmount ?? 0, debouncedLeverage ?? 0);
  }, [handleSimulation, debouncedAmount, debouncedLeverage]);

  return { refreshSimulation };
}
