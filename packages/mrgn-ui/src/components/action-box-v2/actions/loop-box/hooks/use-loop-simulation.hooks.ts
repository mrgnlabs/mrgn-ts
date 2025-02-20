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
  extractErrorString,
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
  actionMessages: ActionMessageType[];
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
  const prevActionTxn = usePrevious(actionTxns?.transactions);

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

  const simulationAction = async (txns: LoopActionTxns, account: MarginfiAccountWrapper, bank: ExtendedBankInfo) => {
    if (txns.transactions.length > 0) {
      const simulationResult = await getSimulationResult({
        account,
        bank,
        txns: txns.transactions,
      });

      if (simulationResult.actionMethod) {
        return { simulationResult: null, actionMessage: simulationResult.actionMethod };
      } else if (simulationResult.simulationResult) {
        return { simulationResult: simulationResult.simulationResult, actionMessage: null };
      } else {
        const errorMessage = STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED;
        return { simulationResult: null, actionMessage: errorMessage };
      }
    } else {
      throw new Error("account, bank or transactions are null"); // TODO: return error message?
    }
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
  }): Promise<{ actionTxns: LoopActionTxns | null; actionMessage: ActionMessageType | null }> => {
    try {
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

      if (loopingResult && "actionQuote" in loopingResult) {
        return {
          actionTxns: loopingResult,
          actionMessage: null,
        };
      } else {
        const errorMessage = loopingResult ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED;
        return {
          actionTxns: null,
          actionMessage: errorMessage,
        };
      }
    } catch (error) {
      console.error("Error fetching looping transaction", error);
      return {
        actionTxns: null,
        actionMessage: STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED,
      };
    }
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
          console.error("Missing params");
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

        if (loopActionTxns.actionMessage || loopActionTxns.actionTxns === null) {
          handleError(loopActionTxns.actionMessage ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        }

        const simulationResult = await simulationAction(loopActionTxns.actionTxns, selectedAccount, selectedBank);

        if (simulationResult.actionMessage || simulationResult.simulationResult === null) {
          handleError(simulationResult.actionMessage ?? STATIC_SIMULATION_ERRORS.DEPOSIT_FAILED, {
            setErrorMessage,
            setSimulationResult,
            setActionTxns,
            setIsLoading,
          });
          return;
        } else if (simulationResult.simulationResult) {
          setActionTxns(loopActionTxns.actionTxns);
          setSimulationResult(simulationResult.simulationResult);
        } else {
          throw new Error("Unknown error"); // TODO: return error message?
        }
      } catch (error) {
        console.error("Error simulating transaction", error);
        setSimulationResult(null);
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

    if (isRefreshTxn) {
      handleSimulation(debouncedAmount, debouncedLeverage);
    }
  }, [
    actionMessages,
    actionTxns,
    debouncedAmount,
    debouncedLeverage,
    handleSimulation,
    isRefreshTxn,
    prevDebouncedAmount,
    prevDebouncedLeverage,
  ]);
  ///////////////////////

  ///////////////////////
  // Fetch max repayable collateral and max leverage based when the secondary bank changes
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
