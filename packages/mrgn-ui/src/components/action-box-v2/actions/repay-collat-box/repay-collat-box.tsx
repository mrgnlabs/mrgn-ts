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
  checkRepayCollatActionAvailable,
  ExecuteRepayWithCollatActionProps,
  ActionTxns,
  MultiStepToastHandle,
  cn,
  IndividualFlowError,
} from "@mrgnlabs/mrgn-utils";
import { IconCheck } from "@tabler/icons-react";

import { CircularProgress } from "~/components/ui/circular-progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ActionButton, ActionSettingsButton } from "~/components/action-box-v2/components";
import { useActionAmounts, usePollBlockHeight } from "~/components/action-box-v2/hooks";
import { ActionMessage } from "~/components";
import { IconLoader } from "~/components/ui/icons";
import { ActionSimulationStatus } from "../../components";

import { SimulationStatus } from "../../utils/simulation.utils";
import { handleExecuteRepayCollatAction } from "./utils";
import { Collateral, ActionInput, Preview } from "./components";
import { useRepayCollatBoxStore } from "./store";
import { useRepayCollatSimulation } from "./hooks";

import { useActionBoxStore } from "../../store";
import { useActionContext } from "../../contexts";

// error handling
export type RepayCollatBoxProps = {
  nativeSolBalance: number;
  // tokenAccountMap: TokenAccountMap;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;
  showAvailableCollateral?: boolean;

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const RepayCollatBox = ({
  nativeSolBalance,
  connected,
  // tokenAccountMap,
  banks,
  marginfiClient,
  selectedAccount,
  accountSummaryArg,
  requestedBank,
  isDialog,
  showAvailableCollateral,
  onComplete,
  captureEvent,
}: RepayCollatBoxProps) => {
  const [
    maxAmountCollateral,
    repayAmount,
    amountRaw,
    selectedBank,
    selectedSecondaryBank,
    errorMessage,
    simulationResult,
    actionTxns,
    refreshState,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    fetchActionBoxState,
    setAmountRaw,
    setSelectedBank,
    setSelectedSecondaryBank,
    setRepayAmount,
    setMaxAmountCollateral,
    refreshSelectedBanks,
  ] = useRepayCollatBoxStore((state) => [
    state.maxAmountCollateral,
    state.repayAmount,
    state.amountRaw,
    state.selectedBank,
    state.selectedSecondaryBank,
    state.errorMessage,
    state.simulationResult,
    state.actionTxns,
    state.refreshState,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.fetchActionBoxState,
    state.setAmountRaw,
    state.setSelectedBank,
    state.setSelectedSecondaryBank,
    state.setRepayAmount,
    state.setMaxAmountCollateral,
    state.refreshSelectedBanks,
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

  const { broadcastType, priorityFees } = useActionContext() || { broadcastType: null, priorityFees: null };

  const { isRefreshTxn, blockProgress } = usePollBlockHeight(
    marginfiClient?.provider.connection,
    actionTxns.lastValidBlockHeight
  );

  const [setIsSettingsDialogOpen, setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.setIsSettingsDialogOpen,
    state.setPreviousTxn,
    state.setIsActionComplete,
  ]);

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
    actionMode: ActionType.RepayCollat,
    maxAmountCollateral,
  });

  const { actionSummary, refreshSimulation } = useRepayCollatSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    marginfiClient,
    accountSummary,
    selectedBank,
    selectedSecondaryBank,
    actionTxns,
    simulationResult,
    isRefreshTxn,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setRepayAmount,
    setIsLoading: setIsSimulating,
    setMaxAmountCollateral,
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
    }
  }, [errorMessage]);

  const actionMessages = React.useMemo(
    () =>
      checkRepayCollatActionAvailable({
        amount,
        connected,
        selectedBank,
        selectedSecondaryBank,
        actionQuote: actionTxns.actionQuote,
      }),
    [amount, connected, selectedBank, selectedSecondaryBank, actionTxns.actionQuote]
  );

  /////////////////////////
  // Repay Collat Action //
  /////////////////////////
  const executeAction = async (
    props: ExecuteRepayWithCollatActionProps,
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
    const action = async (props: ExecuteRepayWithCollatActionProps) => {
      await handleExecuteRepayCollatAction({
        props,
        captureEvent: (event, properties) => {
          callbacks.captureEvent && callbacks.captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          callbacks.setIsActionComplete(true);
          callbacks.setPreviousTxn({
            txn: txnSigs[txnSigs.length - 1] ?? "",
            txnType: "LEND",
            lendingOptions: {
              amount: repayAmount,
              type: ActionType.RepayCollat,
              bank: selectedBank as ActiveBankInfo,
              collatRepay: {
                borrowBank: selectedBank as ActiveBankInfo,
                withdrawBank: selectedSecondaryBank as ActiveBankInfo,
                withdrawAmount: amount,
              },
            },
          });

          callbacks.onComplete &&
            callbacks.onComplete({
              txn: txnSigs[txnSigs.length - 1] ?? "",
              txnType: "LEND",
              lendingOptions: {
                amount: props.withdrawAmount,
                type: ActionType.RepayCollat,
                bank: props.borrowBank as ActiveBankInfo,
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
    callbacks.setAmountRaw("");
  };

  const retryRepayColatAction = React.useCallback(
    async (params: ExecuteRepayWithCollatActionProps) => {
      executeAction(params, {
        captureEvent,
        setIsActionComplete,
        setPreviousTxn,
        onComplete,
        setIsLoading: setIsTransactionExecuting,
        retryCallback: (txns, multiStepToast) =>
          retryRepayColatAction({ ...params, actionTxns: txns, multiStepToast: multiStepToast }),
        setAmountRaw,
      });
    },
    [captureEvent, onComplete, setAmountRaw, setIsActionComplete, setPreviousTxn]
  );

  const handleRepayCollatAction = React.useCallback(async () => {
    if (
      !selectedBank ||
      !amount ||
      !marginfiClient ||
      !selectedAccount ||
      !selectedSecondaryBank ||
      !actionTxns.actionQuote ||
      !broadcastType ||
      !priorityFees
    ) {
      return;
    }

    const props: ExecuteRepayWithCollatActionProps = {
      marginfiClient,
      actionTxns,
      processOpts: {
        ...priorityFees,
        broadcastType,
      },
      txOpts: {},

      marginfiAccount: selectedAccount,
      borrowBank: selectedBank,
      withdrawAmount: amount,
      repayAmount,
      depositBank: selectedSecondaryBank,
      quote: actionTxns.actionQuote!,
      connection: marginfiClient.provider.connection,
    };

    executeAction(props, {
      captureEvent,
      setIsActionComplete,
      setPreviousTxn,
      onComplete,
      setIsLoading: setIsTransactionExecuting,
      retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) =>
        retryRepayColatAction({ ...props, actionTxns: txns, multiStepToast }),
      setAmountRaw,
    });
  }, [
    actionTxns,
    amount,
    broadcastType,
    captureEvent,
    marginfiClient,
    onComplete,
    priorityFees,
    repayAmount,
    retryRepayColatAction,
    selectedAccount,
    selectedBank,
    selectedSecondaryBank,
    setAmountRaw,
    setIsActionComplete,
    setPreviousTxn,
  ]);

  React.useEffect(() => {
    if (isSimulating.status === SimulationStatus.COMPLETE && additionalActionMessages.length === 0) {
      setShowSimSuccess(true);
      setTimeout(() => {
        setShowSimSuccess(false);
      }, 3000);
    }
  }, [isSimulating.status, additionalActionMessages]);

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
      )}
      <div className="mb-6">
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
          setSelectedSecondaryBank={(bank) => {
            setSelectedSecondaryBank(bank);
          }}
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
          <Collateral selectedAccount={selectedAccount} actionSummary={actionSummary} />
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
            handleRepayCollatAction();
          }}
          buttonLabel={"Repay"}
        />
      </div>

      <div className="flex items-center justify-between">
        <ActionSimulationStatus
          simulationStatus={isSimulating.status}
          hasErrorMessages={additionalActionMessages.length > 0}
          isActive={selectedBank && amount > 0 ? true : false}
        />
        <ActionSettingsButton setIsSettingsActive={setIsSettingsDialogOpen} />
      </div>

      <Preview actionSummary={actionSummary} selectedBank={selectedBank} isLoading={isLoading} />
    </>
  );
};
function checkRepayColatActionAvailable(arg0: {
  amount: number;
  connected: boolean;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  actionQuote: import("@jup-ag/api").QuoteResponse | null;
}): any {
  throw new Error("Function not implemented.");
}
