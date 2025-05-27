import React from "react";
import BigNumber from "bignumber.js";

import {
  computeMaxLeverage,
  EmodeImpact,
  MarginfiAccountWrapper,
  MarginfiClient,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  ActionProcessingError,
  DYNAMIC_SIMULATION_ERRORS,
  extractErrorString,
  LoopActionTxns,
  STATIC_SIMULATION_ERRORS,
  usePrevious,
  JupiterOptions,
} from "@mrgnlabs/mrgn-utils";
import { AccountSummary, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useActionBoxStore } from "~/components/action-box-v2/store";
import { SimulationStatus } from "~/components/action-box-v2/utils";

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
  jupiterOptions: JupiterOptions | null;
  emodeImpact: EmodeImpact | null;
  actionMessages: ActionMessageType[];

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
  jupiterOptions,
  emodeImpact,
  actionMessages,
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

  ///////////////////////
  // Handle simulation //
  const handleError = (
    actionMessage: ActionMessageType | string,
    callbacks: {
      setErrorMessage: (error: ActionMessageType | null) => void;
      setSimulationResult: (result: SimulationResult | null) => void;
      setActionTxns: (actionTxns: LoopActionTxns) => void;
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

  const fetchLoopingTxn = async (props: {
    marginfiClient: MarginfiClient;
    marginfiAccount: MarginfiAccountWrapper;
    depositBank: ExtendedBankInfo;
    borrowBank: ExtendedBankInfo;
    targetLeverage: number;
    depositAmount: number;
    jupiterOptions: JupiterOptions;
    platformFeeBps: number;
  }): Promise<{ actionTxns: LoopActionTxns }> => {
    const loopingResult = await calculateLooping({
      marginfiClient: props.marginfiClient,
      marginfiAccount: props.marginfiAccount,
      depositBank: props.depositBank,
      borrowBank: props.borrowBank,
      targetLeverage: props.targetLeverage,
      depositAmount: props.depositAmount,
      slippageBps: props.jupiterOptions?.slippageBps,
      slippageMode: props.jupiterOptions?.slippageMode,
      connection: props.marginfiClient.provider.connection,
      platformFeeBps: props.platformFeeBps,
    });
    return {
      actionTxns: loopingResult,
    };
  };

  const handleSimulation = React.useCallback(
    async (amount: number, leverage: number) => {
      try {
        if (
          !selectedAccount ||
          !marginfiClient ||
          !selectedBank ||
          !selectedSecondaryBank ||
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

        const props = {
          marginfiClient: marginfiClient,
          marginfiAccount: selectedAccount,
          depositBank: selectedBank,
          borrowBank: selectedSecondaryBank,
          targetLeverage: leverage,
          depositAmount: amount,
          jupiterOptions: jupiterOptions,
          platformFeeBps: platformFeeBps,
        };

        const loopActionTxns = await fetchLoopingTxn(props);

        const simulationResult = await getSimulationResult({
          txns: loopActionTxns.actionTxns.transactions,
          account: selectedAccount,
          banks: [selectedBank, selectedSecondaryBank],
        });

        setActionTxns(loopActionTxns.actionTxns);
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
      jupiterOptions,
      marginfiClient,
      platformFeeBps,
      selectedAccount,
      selectedBank,
      selectedSecondaryBank,
      setActionTxns,
      setErrorMessage,
      setIsLoading,
      setSimulationResult,
    ]
  );

  React.useEffect(() => {
    const isDisabled = actionMessages.some((message) => !message.isEnabled);

    if ((prevDebouncedAmount !== debouncedAmount || prevDebouncedLeverage !== debouncedLeverage) && !isDisabled) {
      handleSimulation(debouncedAmount, debouncedLeverage);
    }
  }, [
    actionMessages,
    actionTxns,
    debouncedAmount,
    debouncedLeverage,
    handleSimulation,
    prevDebouncedAmount,
    prevDebouncedLeverage,
  ]);
  ///////////////////////

  ///////////////////////
  // Fetch max repayable collateral and max leverage based when the secondary bank changes
  const fetchMaxLeverage = React.useCallback(async () => {
    if (selectedBank && selectedSecondaryBank) {
      const { maxLeverage, ltv } = computeMaxLeverage(selectedBank.info.rawBank, selectedSecondaryBank.info.rawBank, {
        assetWeightInit: emodeImpact?.activePair?.assetWeightInit
          ? BigNumber.max(emodeImpact.activePair.assetWeightInit, selectedBank.info.rawBank.config.assetWeightInit)
          : undefined,
      });

      if (!maxLeverage) {
        const errorMessage = DYNAMIC_SIMULATION_ERRORS.REPAY_COLLAT_FAILED_CHECK(
          selectedSecondaryBank.meta.tokenSymbol
        );
        setErrorMessage(errorMessage);
      } else {
        setMaxLeverage(maxLeverage);
      }
    }
  }, [selectedBank, emodeImpact, selectedSecondaryBank, setErrorMessage, setMaxLeverage]);

  React.useEffect(() => {
    if (!selectedSecondaryBank) {
      return;
    }
    const hasBankChanged = !prevSelectedSecondaryBank?.address.equals(selectedSecondaryBank.address);
    if (hasBankChanged) {
      fetchMaxLeverage();
    }
  }, [selectedSecondaryBank, prevSelectedSecondaryBank, fetchMaxLeverage]);
  ///////////////////////

  ///////////////////////
  // Handle action summary
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
    actionSummary,
    refreshSimulation,
  };
}
