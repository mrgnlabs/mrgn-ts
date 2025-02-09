import React from "react";

import {
  ExtendedBankInfo,
  ActionType,
  AccountSummary,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
  ActiveBankInfo,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  PreviousTxn,
  ActionMessageType,
  showErrorToast,
  ActionTxns,
  MultiStepToastHandle,
  IndividualFlowError,
  checkRepayActionAvailable,
  ExecuteRepayActionProps,
} from "@mrgnlabs/mrgn-utils";
import { IconSettings } from "@tabler/icons-react";

import {
  ActionBoxContentWrapper,
  ActionButton,
  ActionCollateralProgressBar,
  ActionSettingsButton,
} from "~/components/action-box-v2/components";
import { useActionAmounts, usePollBlockHeight } from "~/components/action-box-v2/hooks";
import { ActionMessage } from "~/components";
import { ActionSimulationStatus } from "../../components";
import { useRepayBoxStore } from "./store";
import { SimulationStatus } from "../../utils";
import { useActionBoxStore } from "../../store";
import { useRepaySimulation } from "./hooks";
import { CircularProgress } from "~/components/ui/circular-progress";
import { ActionInput, Preview } from "./components";
import { useActionContext } from "../../contexts";
import { handleExecuteRepayAction } from "./utils/repay-action.utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { TooltipProvider } from "~/components/ui/tooltip";

export type RepayBoxProps = {
  nativeSolBalance: number;
  connected: boolean;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedBank?: ExtendedBankInfo;
  requestedSecondaryBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;

  showAvailableCollateral?: boolean;

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
  setDisplaySettings?: (displaySettings: boolean) => void;
};

export const RepayBox = ({
  nativeSolBalance,
  connected,
  marginfiClient,
  selectedAccount,
  banks,
  requestedBank,
  requestedSecondaryBank,
  accountSummaryArg,
  isDialog,
  showAvailableCollateral,
  onComplete,
  captureEvent,
  setDisplaySettings,
}: RepayBoxProps) => {
  const [
    amountRaw,
    repayAmount,
    selectedBank,
    selectedSecondaryBank,
    simulationResult,
    actionTxns,
    errorMessage,

    maxAmountCollateral,
    maxOverflowHit,

    refreshState,
    refreshSelectedBanks,
    fetchActionBoxState,
    setAmountRaw,
    setRepayAmount,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setSelectedBank,
    setSelectedSecondaryBank,

    setMaxAmountCollateral,
    setMaxOverflowHit,
  ] = useRepayBoxStore((state) => [
    state.amountRaw,
    state.repayAmount,
    state.selectedBank,
    state.selectedSecondaryBank,
    state.simulationResult,
    state.actionTxns,
    state.errorMessage,

    state.maxAmountCollateral,
    state.maxOverflowHit,
    state.refreshState,
    state.refreshSelectedBanks,
    state.fetchActionBoxState,
    state.setAmountRaw,
    state.setRepayAmount,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.setSelectedBank,
    state.setSelectedSecondaryBank,

    state.setMaxAmountCollateral,
    state.setMaxOverflowHit,
  ]);

  const [isTransactionExecuting, setIsTransactionExecuting] = React.useState(false);
  const [isSimulating, setIsSimulating] = React.useState<{
    isLoading: boolean;
    status: SimulationStatus;
  }>({
    isLoading: false,
    status: SimulationStatus.IDLE,
  });

  const isLoading = React.useMemo(
    () => isTransactionExecuting || isSimulating.isLoading,
    [isTransactionExecuting, isSimulating.isLoading]
  );

  const { transactionSettings, priorityFees, jupiterOptions } = useActionContext() || {
    transactionSettings: null,
    priorityFees: null,
    jupiterOptions: null,
  };
  const { isRefreshTxn, blockProgress } = usePollBlockHeight(
    marginfiClient?.provider.connection,
    actionTxns?.lastValidBlockHeight
  );

  const [setPreviousTxn, setIsActionComplete, platformFeeBps] = useActionBoxStore((state) => [
    state.setPreviousTxn,
    state.setIsActionComplete,
    state.platformFeeBps,
  ]);

  const accountSummary = React.useMemo(() => {
    return (
      accountSummaryArg ?? (selectedAccount ? computeAccountSummary(selectedAccount, banks) : DEFAULT_ACCOUNT_SUMMARY)
    );
  }, [accountSummaryArg, selectedAccount, banks]);

  const actionMode = React.useMemo(() => {
    return selectedBank?.address.toBase58() !== selectedSecondaryBank?.address.toBase58()
      ? ActionType.RepayCollat
      : ActionType.Repay;
  }, [selectedBank, selectedSecondaryBank]);

  const buttonLabel = React.useMemo(() => {
    return selectedBank?.address.toBase58() !== selectedSecondaryBank?.address.toBase58()
      ? `Repay with ${selectedSecondaryBank?.meta.tokenSymbol}`
      : "Repay";
  }, [selectedBank, selectedSecondaryBank]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank: selectedBank,
    nativeSolBalance,
    actionMode,
    maxAmountCollateral,
  });

  const { actionSummary, refreshSimulation } = useRepaySimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    marginfiClient,
    accountSummary,
    selectedBank,
    selectedSecondaryBank,
    actionTxns,
    simulationResult,
    isRefreshTxn,
    platformFeeBps,
    jupiterOptions,

    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setRepayAmount,
    setIsLoading: setIsSimulating,
    setMaxAmountCollateral,
    setMaxOverflowHit,
  });

  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

  React.useEffect(() => {
    if (debouncedAmount === 0 && simulationResult) {
      setActionTxns({
        transactions: [],
        actionQuote: null,
      });
      setSimulationResult(null);
    }
  }, [simulationResult, debouncedAmount, setActionTxns, setSimulationResult]);

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState();
    }
  }, [refreshState, connected]);

  // Only set the action box state on mount
  React.useEffect(() => {
    fetchActionBoxState({ requestedBank: requestedBank, requestedSecondaryBank: requestedSecondaryBank });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      showErrorToast(errorMessage?.description);
      setAdditionalActionMessages([errorMessage]);
    } else {
      setAdditionalActionMessages([]);
    }
  }, [errorMessage]);

  React.useEffect(() => {
    return () => {
      refreshState();
    };
  }, [refreshState]);

  const actionMessages = React.useMemo(() => {
    return checkRepayActionAvailable({
      amount,
      connected,
      selectedBank,
      selectedSecondaryBank,
      actionQuote: actionTxns?.actionQuote ?? null,
      maxOverflowHit,
    });
  }, [amount, connected, selectedBank, selectedSecondaryBank, actionTxns.actionQuote, maxOverflowHit]);

  //////////////////
  // Repay Action //
  //////////////////
  const executeAction = async (
    props: ExecuteRepayActionProps,
    callbacks: {
      captureEvent?: (event: string, properties?: Record<string, any>) => void;
      setIsActionComplete: (isComplete: boolean) => void;
      setPreviousTxn: (previousTxn: PreviousTxn) => void;
      onComplete?: (previousTxn: PreviousTxn) => void;
      setIsLoading: (isLoading: boolean) => void;
      retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => void;
      setAmountRaw: (amountRaw: string) => void;
    }
  ) => {
    const action = async (props: ExecuteRepayActionProps) => {
      await handleExecuteRepayAction({
        props,
        captureEvent: (event, properties) => {
          callbacks.captureEvent && callbacks.captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          callbacks.setIsActionComplete(true);

          callbacks.setPreviousTxn({
            txn: txnSigs[txnSigs.length - 1] ?? "",
            txnType: "REPAY",
            repayOptions: {
              type:
                props.selectedBank?.address.toBase58() === props.selectedSecondaryBank?.address.toBase58()
                  ? ActionType.Repay
                  : ActionType.RepayCollat,
              selectedBank: props.selectedBank as ActiveBankInfo,
              selectedSecondaryBank: props.selectedSecondaryBank as ActiveBankInfo,
              repayAmount: props.repayAmount,
              withdrawAmount: props.withdrawAmount,
            },
          });

          callbacks.onComplete &&
            callbacks.onComplete({
              txn: txnSigs[txnSigs.length - 1] ?? "",
              txnType: "REPAY",
              repayOptions: {
                type:
                  props.selectedBank?.address.toBase58() === props.selectedSecondaryBank?.address.toBase58()
                    ? ActionType.Repay
                    : ActionType.RepayCollat,
                selectedBank: props.selectedBank as ActiveBankInfo,
                selectedSecondaryBank: props.selectedSecondaryBank as ActiveBankInfo,
                repayAmount: props.repayAmount,
                withdrawAmount: props.withdrawAmount,
              },
            });
        },
        setError: (error: IndividualFlowError) => {
          const toast = error.multiStepToast as MultiStepToastHandle;
          const txs = error.actionTxns as ActionTxns;
          let retry = undefined;
          if (error.retry && toast && txs) {
            retry = () => callbacks.retryCallback(txs, toast);
          }
          toast.setFailed(error.message, retry);
          callbacks.setIsLoading(false);
        },
        setIsLoading: (isLoading) => callbacks.setIsLoading(isLoading),
      });
    };

    await action(props);
  };

  const retryRepayAction = React.useCallback(
    (params: ExecuteRepayActionProps) => {
      executeAction(params, {
        captureEvent,
        setIsActionComplete,
        setPreviousTxn,
        onComplete,
        setIsLoading: setIsTransactionExecuting,
        retryCallback: (txns, multiStepToast) =>
          retryRepayAction({ ...params, actionTxns: txns, multiStepToast: multiStepToast }),
        setAmountRaw,
      });
    },
    [captureEvent, setIsActionComplete, setPreviousTxn, onComplete, setAmountRaw]
  );

  const handleRepayAction = React.useCallback(async () => {
    if (
      !marginfiClient ||
      !selectedAccount ||
      !marginfiClient.provider.connection ||
      !transactionSettings ||
      !selectedBank ||
      !selectedSecondaryBank
    ) {
      return;
    }

    const props: ExecuteRepayActionProps = {
      marginfiClient,
      actionTxns,
      processOpts: {
        ...priorityFees,
        broadcastType: transactionSettings?.broadcastType,
      },
      txOpts: {},

      marginfiAccount: selectedAccount,
      repayAmount,
      withdrawAmount: amount,
      selectedBank,
      selectedSecondaryBank,
      quote: actionTxns.actionQuote ?? null,
      connection: marginfiClient?.provider.connection,
    };

    await executeAction(props, {
      captureEvent: captureEvent,
      setIsActionComplete: setIsActionComplete,
      setPreviousTxn: setPreviousTxn,
      onComplete: onComplete,
      setIsLoading: setIsTransactionExecuting,
      retryCallback: (txns, multiStepToast) =>
        retryRepayAction({ ...props, actionTxns: txns, multiStepToast: multiStepToast }),
      setAmountRaw: setAmountRaw,
    });
  }, [
    actionTxns,
    amount,
    transactionSettings,
    captureEvent,
    marginfiClient,
    onComplete,
    priorityFees,
    repayAmount,
    retryRepayAction,
    selectedAccount,
    selectedBank,
    selectedSecondaryBank,
    setAmountRaw,
    setIsActionComplete,
    setPreviousTxn,
  ]);

  return (
    <ActionBoxContentWrapper>
      {actionTxns.lastValidBlockHeight && blockProgress !== 0 && (
        <div className="mb-6">
          <div className="absolute top-0 right-0 z-50">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <CircularProgress
                    size={18}
                    strokeWidth={3}
                    value={blockProgress * 100}
                    strokeColor="stroke-mfi-action-box-accent-foreground/50"
                    backgroundColor="stroke-mfi-action-box-background-dark"
                  />
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
        </div>
      )}
      <div>
        <ActionInput
          banks={banks}
          nativeSolBalance={nativeSolBalance}
          amount={amount}
          amountRaw={amountRaw}
          maxAmount={maxAmount}
          repayAmount={repayAmount}
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedBank}
          setSelectedSecondaryBank={setSelectedSecondaryBank}
          maxAmountCollateral={maxAmountCollateral}
          actionMethod={actionMode}
        />
      </div>

      {additionalActionMessages.concat(actionMessages).map(
        (actionMessage, idx) =>
          actionMessage.description && (
            <div className="pb-6" key={idx}>
              <ActionMessage
                _actionMessage={actionMessage}
                retry={refreshSimulation}
                isRetrying={isSimulating.isLoading}
              />
            </div>
          )
      )}

      {showAvailableCollateral && (
        <div className="mb-6">
          <ActionCollateralProgressBar selectedAccount={selectedAccount} actionSummary={actionSummary} />
        </div>
      )}

      <div className="mb-3">
        <ActionButton
          isLoading={isLoading}
          isEnabled={
            !additionalActionMessages.concat(actionMessages).filter((value) => value.isEnabled === false).length
          }
          connected={connected}
          handleAction={() => {
            handleRepayAction();
          }}
          buttonLabel={buttonLabel}
        />
      </div>

      <div className="flex items-center justify-between">
        <ActionSimulationStatus
          simulationStatus={isSimulating.status}
          hasErrorMessages={additionalActionMessages.length > 0}
          isActive={selectedBank && amount > 0 ? true : false}
        />
        {setDisplaySettings && <ActionSettingsButton onClick={() => setDisplaySettings(true)} />}
      </div>

      <Preview actionSummary={actionSummary} selectedBank={selectedBank} isLoading={isLoading} />
    </ActionBoxContentWrapper>
  );
};
