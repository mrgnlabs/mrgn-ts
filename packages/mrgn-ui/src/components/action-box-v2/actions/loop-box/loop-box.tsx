import React from "react";

import {
  ExtendedBankInfo,
  ActionType,
  AccountSummary,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
  ActiveBankInfo,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { IconCheck } from "@tabler/icons-react";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  ActionTxns,
  checkLoopActionAvailable,
  ExecuteLoopingActionProps,
  MultiStepToastHandle,
  PreviousTxn,
  showErrorToast,
  cn,
} from "@mrgnlabs/mrgn-utils";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { WalletContextStateOverride } from "~/components/wallet-v2";
import { CircularProgress } from "~/components/ui/circular-progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ActionButton, ActionSettingsButton } from "~/components/action-box-v2/components";
import { useActionAmounts, usePollBlockHeight } from "~/components/action-box-v2/hooks";
import { ActionMessage } from "~/components";

import { useActionBoxStore } from "../../store";

import { SimulationStatus } from "../../utils/simulation.utils";
import { handleExecuteLoopAction } from "./utils";
import { ActionInput, Preview } from "./components";
import { useLoopBoxStore } from "./store";
import { useLoopSimulation } from "./hooks";
import { LeverageSlider } from "./components/leverage-slider";
import { ApyStat } from "./components/apy-stat";
import { ActionSimulationStatus } from "../../components";
import { IconLoader } from "~/components/ui/icons";
import { useActionContext } from "../../contexts";

// error handling
export type LoopBoxProps = {
  nativeSolBalance: number;
  // tokenAccountMap: TokenAccountMap;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;

  isDialog?: boolean;

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const LoopBox = ({
  nativeSolBalance,
  connected,
  // tokenAccountMap,
  banks,
  marginfiClient,
  selectedAccount,
  accountSummaryArg,
  requestedBank,
  isDialog,
  onComplete,
  captureEvent,
}: LoopBoxProps) => {
  const [
    leverage,
    maxLeverage,
    amountRaw,
    selectedBank,
    selectedSecondaryBank,
    errorMessage,
    isLoading,
    simulationResult,
    actionTxns,
    depositLstApy,
    borrowLstApy,
    refreshState,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    fetchActionBoxState,
    setAmountRaw,
    setSelectedBank,
    setSelectedSecondaryBank,
    setMaxLeverage,
    setLeverage,
    setIsLoading,
    refreshSelectedBanks,
  ] = useLoopBoxStore((state) => [
    state.leverage,
    state.maxLeverage,
    state.amountRaw,
    state.selectedBank,
    state.selectedSecondaryBank,
    state.errorMessage,
    state.isLoading,
    state.simulationResult,
    state.actionTxns,
    state.depositLstApy,
    state.borrowLstApy,
    state.refreshState,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.fetchActionBoxState,
    state.setAmountRaw,
    state.setSelectedBank,
    state.setSelectedSecondaryBank,
    state.setMaxLeverage,
    state.setLeverage,
    state.setIsLoading,
    state.refreshSelectedBanks,
  ]);

  const { broadcastType, priorityFees } = useActionContext() || { broadcastType: null, priorityFees: null };

  const [slippage, setIsSettingsDialogOpen, setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.slippageBps,
    state.setIsSettingsDialogOpen,
    state.setPreviousTxn,
    state.setIsActionComplete,
  ]);

  const { isRefreshTxn, blockProgress } = usePollBlockHeight(
    marginfiClient?.provider.connection,
    actionTxns.lastValidBlockHeight
  );

  React.useEffect(() => {
    return () => {
      refreshState();
    };
  }, [refreshState]);

  const accountSummary = React.useMemo(() => {
    return (
      accountSummaryArg ?? (selectedAccount ? computeAccountSummary(selectedAccount, banks) : DEFAULT_ACCOUNT_SUMMARY)
    );
  }, [accountSummaryArg, selectedAccount, banks]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    actionMode: ActionType.Loop,
  });

  const debouncedLeverage = useAmountDebounce<number | null>(leverage, 1000);

  const { actionSummary, refreshSimulation, simulationStatus } = useLoopSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    debouncedLeverage: debouncedLeverage ?? 0,
    selectedAccount,
    marginfiClient,
    accountSummary,
    selectedBank,
    selectedSecondaryBank,
    actionTxns,
    simulationResult,
    isRefreshTxn,
    setMaxLeverage,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading,
  });

  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

  const [showSimSuccess, setShowSimSuccess] = React.useState(false);

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState();
    }
  }, [refreshState, connected]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedBank });
  }, [requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      showErrorToast(errorMessage?.description);
      setAdditionalActionMessages([errorMessage]);
    } else {
      setAdditionalActionMessages([]);
    }
  }, [errorMessage]);

  const actionMessages = React.useMemo(
    () =>
      checkLoopActionAvailable({
        amount,
        connected,
        selectedBank,
        selectedSecondaryBank,
        actionQuote: actionTxns.actionQuote,
      }),
    [amount, connected, selectedBank, selectedSecondaryBank, actionTxns.actionQuote]
  );

  /////////////////////
  // Looping Actions //
  /////////////////////
  const executeAction = async (
    params: ExecuteLoopingActionProps,
    leverage: number,
    callbacks: {
      captureEvent?: (event: string, properties?: Record<string, any>) => void;
      setIsActionComplete: (isComplete: boolean) => void;
      setPreviousTxn: (previousTxn: PreviousTxn) => void;
      onComplete?: (txn: PreviousTxn) => void;
      setIsLoading: (isLoading: boolean) => void;
      setAmountRaw: (amountRaw: string) => void;
      retryCallback: (txs: ActionTxns, toast: MultiStepToastHandle) => void;
    }
  ) => {
    const action = async (params: ExecuteLoopingActionProps) => {
      await handleExecuteLoopAction({
        props: params,
        captureEvent: (event, properties) => {
          callbacks.captureEvent && callbacks.captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          callbacks.setIsActionComplete(true);
          callbacks.setPreviousTxn({
            txn: txnSigs.pop() ?? "",
            txnType: "LOOP",
            loopOptions: {
              depositBank: params.depositBank as ActiveBankInfo,
              borrowBank: params.borrowBank as ActiveBankInfo,
              depositAmount: params.actualDepositAmount,
              borrowAmount: params.borrowAmount.toNumber(),
              leverage: leverage,
            },
          });

          callbacks.onComplete &&
            callbacks.onComplete({
              txn: txnSigs.pop() ?? "",
              txnType: "LEND",
              lendingOptions: {
                amount: params.depositAmount,
                type: ActionType.Loop,
                bank: params.depositBank as ActiveBankInfo,
              },
            });
        },
        setError: (error: any) => {
          const toast = error.multiStepToast as MultiStepToastHandle;
          const txs = error.actionTxns as ActionTxns;
          const errorMessage = error.errorMessage;
          toast.setFailed(errorMessage, () => callbacks.retryCallback(txs, toast));
        },
        setIsLoading: (isLoading) => callbacks.setIsLoading(isLoading),
      });
    };

    await action(params);
    callbacks.setAmountRaw("");
  };

  const retryLoopAction = React.useCallback(
    (params: ExecuteLoopingActionProps, leverage: number) => {
      executeAction(params, leverage, {
        captureEvent,
        setIsActionComplete,
        setPreviousTxn,
        onComplete,
        setIsLoading,
        setAmountRaw,
        retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
          retryLoopAction({ ...params, actionTxns: txns, multiStepToast }, leverage);
        },
      });
    },
    [captureEvent, onComplete, setAmountRaw, setIsActionComplete, setIsLoading, setPreviousTxn]
  );

  const handleLoopAction = React.useCallback(async () => {
    if (!selectedBank || !amount || !marginfiClient || !selectedSecondaryBank || !broadcastType || !priorityFees) {
      return;
    }

    const params: ExecuteLoopingActionProps = {
      marginfiClient,
      actionTxns,
      processOpts: {
        ...priorityFees,
        broadcastType,
      },
      txOpts: {},

      marginfiAccount: selectedAccount,
      depositAmount: amount,
      borrowAmount: actionTxns.borrowAmount,
      actualDepositAmount: actionTxns.actualDepositAmount,
      depositBank: selectedBank,
      borrowBank: selectedSecondaryBank,
      quote: actionTxns.actionQuote!,
      connection: marginfiClient.provider.connection,
    };

    executeAction(params, leverage, {
      captureEvent,
      setIsActionComplete,
      setPreviousTxn,
      onComplete,
      setIsLoading,
      setAmountRaw,
      retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
        retryLoopAction({ ...params, actionTxns: txns, multiStepToast }, leverage);
      },
    });
  }, [
    actionTxns,
    amount,
    broadcastType,
    captureEvent,
    leverage,
    marginfiClient,
    onComplete,
    priorityFees,
    retryLoopAction,
    selectedAccount,
    selectedBank,
    selectedSecondaryBank,
    setAmountRaw,
    setIsActionComplete,
    setIsLoading,
    setPreviousTxn,
  ]);

  React.useEffect(() => {
    if (marginfiClient) {
      refreshSelectedBanks(banks);
    }
  }, [marginfiClient, banks, refreshSelectedBanks]);

  return (
    <>
      {actionTxns.lastValidBlockHeight && blockProgress !== 0 && (
        <div className="absolute top-5 right-4 z-50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <CircularProgress size={18} strokeWidth={3} value={blockProgress * 100} />
              </TooltipTrigger>
              <TooltipContent side="left">
                <div className="space-y-2">
                  <p>Your transaction is ready for execution.</p>
                  <p>Once the spinner reaches 100%, if not processed, it will refresh to fetch updated quotes.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      <div className="mb-6">
        <ActionInput
          banks={banks}
          nativeSolBalance={nativeSolBalance}
          amountRaw={amountRaw}
          maxAmount={maxAmount}
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedBank}
          setSelectedSecondaryBank={(bank) => {
            setSelectedSecondaryBank(bank);
          }}
          isLoading={isLoading}
          walletAmount={walletAmount}
          actionTxns={actionTxns}
        />
      </div>

      <div className="px-1 space-y-6 mb-4">
        <LeverageSlider
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
          amountRaw={amountRaw}
          leverageAmount={leverage}
          maxLeverage={maxLeverage}
          setLeverageAmount={setLeverage}
        />

        <ApyStat
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
          leverageAmount={leverage}
          depositLstApy={depositLstApy}
          borrowLstApy={borrowLstApy}
        />
      </div>
      {additionalActionMessages.concat(actionMessages).map(
        (actionMessage, idx) =>
          actionMessage.description && (
            <div className="pb-6" key={idx}>
              <ActionMessage
                _actionMessage={actionMessage}
                retry={refreshSimulation}
                isRetrying={simulationStatus === SimulationStatus.SIMULATING}
              />
            </div>
          )
      )}

      <div className="mb-3 space-y-2">
        <ActionButton
          isLoading={isLoading}
          isEnabled={
            !additionalActionMessages.concat(actionMessages).filter((value) => value.isEnabled === false).length
          }
          connected={connected}
          handleAction={() => {
            handleLoopAction();
          }}
          loaderType="INFINITE"
          buttonLabel={"Loop"}
        />
      </div>

      <div className="flex items-center justify-between">
        <ActionSimulationStatus
          simulationStatus={simulationStatus}
          hasErrorMessages={additionalActionMessages.length > 0}
        />
        <ActionSettingsButton setIsSettingsActive={setIsSettingsDialogOpen} />
      </div>

      <Preview actionSummary={actionSummary} selectedBank={selectedBank} isLoading={isLoading} />
    </>
  );
};
