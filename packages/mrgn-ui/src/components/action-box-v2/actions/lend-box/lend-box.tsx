import React from "react";

import { WalletContextState } from "@solana/wallet-adapter-react";

import {
  ActiveBankInfo,
  ExtendedBankInfo,
  ActionType,
  TokenAccountMap,
  AccountSummary,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
} from "@mrgnlabs/marginfi-v2-ui-state";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  ActionTxns,
  checkLendActionAvailable,
  IndividualFlowError,
  MarginfiActionParams,
  MultiStepToastHandle,
  PreviousTxn,
} from "@mrgnlabs/mrgn-utils";
import { IconCheck } from "@tabler/icons-react";

import { ActionButton } from "~/components/action-box-v2/components";
import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { LSTDialog, LSTDialogVariants } from "~/components/LSTDialog";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ActionMessage } from "~/components";

import { useLendBoxStore } from "./store";
import { HandleCloseBalanceParamsProps, handleExecuteCloseBalance, handleExecuteLendingAction } from "./utils";
import { ActionSimulationStatus } from "../../components";
import { Collateral, ActionInput, Preview } from "./components";
import { useLendSimulation, SimulationStatus } from "./hooks";
import { useActionBoxStore } from "../../store";
import { HidePoolStats } from "../../contexts/actionbox/actionbox.context";
import { useActionContext } from "../../contexts";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { IconLoader } from "~/components/ui/icons";
import { IconCheck } from "@tabler/icons-react";

// error handling
export type LendBoxProps = {
  nativeSolBalance: number;
  // tokenAccountMap: TokenAccountMap;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedLendType: ActionType;
  requestedBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;
  showAvailableCollateral?: boolean;
  showTokenSelection?: boolean;
  showTokenSelectionGroups?: boolean;
  hidePoolStats?: HidePoolStats;

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const LendBox = ({
  nativeSolBalance,
  // tokenAccountMap,
  walletContextState,
  connected,
  marginfiClient,
  banks,
  selectedAccount,
  accountSummaryArg,
  isDialog,
  showTokenSelection,
  showAvailableCollateral = true,
  showTokenSelectionGroups,
  requestedLendType,
  requestedBank,
  onComplete,
  captureEvent,
  hidePoolStats,
}: LendBoxProps) => {
  const [
    amountRaw,
    lendMode,
    actionTxns,
    selectedBank,
    simulationResult,
    errorMessage,

    refreshState,
    fetchActionBoxState,
    setLendMode,
    setAmountRaw,
    setSelectedBank,
    refreshSelectedBanks,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
  ] = useLendBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.lendMode,
    state.actionTxns,
    state.selectedBank,
    state.simulationResult,
    state.errorMessage,

    state.refreshState,
    state.fetchActionBoxState,
    state.setLendMode,
    state.setAmountRaw,
    state.setSelectedBank,
    state.refreshSelectedBanks,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
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

  const accountSummary = React.useMemo(() => {
    return (
      accountSummaryArg ?? (selectedAccount ? computeAccountSummary(selectedAccount, banks) : DEFAULT_ACCOUNT_SUMMARY)
    );
  }, [accountSummaryArg, selectedAccount, banks]);

  const [setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.setPreviousTxn,
    state.setIsActionComplete,
  ]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    actionMode: lendMode,
  });
  const { actionSummary, refreshSimulation } = useLendSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    accountSummary,
    selectedBank,
    lendMode,
    actionTxns,
    simulationResult,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading: setIsSimulating,
  });

  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);
  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState(lendMode);
    }
  }, [refreshState, connected, lendMode]);

  React.useEffect(() => {
    return () => {
      refreshState();
    };
  }, [refreshState]);

  //clean state
  React.useEffect(() => {
    console.log("debouncedAmount", debouncedAmount);
    console.log("simulationResult", simulationResult);
    if (debouncedAmount === 0 && simulationResult) {
      console.log("clearing simulation result");
      setActionTxns({ actionTxn: null, additionalTxns: [] });
      setSimulationResult(null);
    }
  }, [simulationResult, debouncedAmount, setActionTxns, setSimulationResult]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedLendType, requestedBank });
  }, [requestedLendType, requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      setAdditionalActionMessages([errorMessage]);
    } else {
      setAdditionalActionMessages([]);
    }
  }, [errorMessage]);

  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(
    () => (lendMode === ActionType.Withdraw && isDust) || false,
    [lendMode, isDust]
  );

  const actionMessages = React.useMemo(
    () =>
      checkLendActionAvailable({
        amount,
        connected,
        showCloseBalance,
        selectedBank,
        banks,
        marginfiAccount: selectedAccount,
        nativeSolBalance,
        lendMode,
      }),
    [amount, connected, showCloseBalance, selectedBank, banks, selectedAccount, nativeSolBalance, lendMode]
  );

  const buttonLabel = React.useMemo(() => (showCloseBalance ? "Close" : lendMode), [showCloseBalance, lendMode]);

  //////////////////////////
  // Close Balance Action //
  //////////////////////////
  const closeBalanceAction = async (
    params: HandleCloseBalanceParamsProps,
    selectedBank: ExtendedBankInfo,
    callbacks: {
      captureEvent?: (event: string, properties?: Record<string, any>) => void;
      setIsActionComplete: (isComplete: boolean) => void;
      setPreviousTxn: (previousTxn: PreviousTxn) => void;
      setIsLoading: (isLoading: boolean) => void;
      onComplete?: (previousTxn: PreviousTxn) => void;
      retryCallback: (multiStepToast: MultiStepToastHandle) => void;
      setAmountRaw: (amount: string) => void;
    }
  ) => {
    await handleExecuteCloseBalance({
      params,
      captureEvent: (event, properties) => {
        callbacks.captureEvent && callbacks.captureEvent(event, properties);
      },
      setIsComplete: (txnSigs) => {
        callbacks.setIsActionComplete(true);
        callbacks.setPreviousTxn({
          txn: txnSigs[txnSigs.length - 1] ?? "",
          txnType: "LEND",
          lendingOptions: {
            amount: 0,
            type: ActionType.Withdraw,
            bank: selectedBank as ActiveBankInfo,
          },
        });

        callbacks.onComplete &&
          callbacks.onComplete({
            txn: txnSigs[txnSigs.length - 1] ?? "",
            txnType: "LEND",
            lendingOptions: {
              amount: 0,
              type: ActionType.Withdraw,
              bank: selectedBank as ActiveBankInfo,
            },
          });
      },
      setError: (error: IndividualFlowError) => {
        const toast = error.multiStepToast as MultiStepToastHandle;
        callbacks.setIsLoading(false);
        let retry = undefined;
        if (error.retry) {
          retry = () => callbacks.retryCallback(toast);
        }
        toast.setFailed(error.message, retry);
      },
      setIsLoading: (isLoading) => callbacks.setIsLoading(isLoading),
    });

    callbacks.setAmountRaw("");
  };

  const retryCloseBalanceAction = React.useCallback(
    async (params: HandleCloseBalanceParamsProps, selectedBank: ExtendedBankInfo) => {
      closeBalanceAction(params, selectedBank, {
        captureEvent: captureEvent,
        setIsActionComplete: setIsActionComplete,
        setPreviousTxn: setPreviousTxn,
        setIsLoading: setIsTransactionExecuting,
        onComplete: onComplete,
        retryCallback: (multiStepToast: MultiStepToastHandle) =>
          retryCloseBalanceAction({ ...params, multiStepToast }, selectedBank),
        setAmountRaw: setAmountRaw,
      });
    },
    [captureEvent, onComplete, setAmountRaw, setIsActionComplete, setIsTransactionExecuting, setPreviousTxn]
  );

  const handleCloseBalance = React.useCallback(async () => {
    if (!selectedBank || !selectedAccount || !broadcastType || !priorityFees) {
      return;
    }

    const params = {
      bank: selectedBank,
      marginfiAccount: selectedAccount,
      processOpts: { ...priorityFees, broadcastType },
    };

    closeBalanceAction(params, selectedBank, {
      captureEvent: captureEvent,
      setIsActionComplete: setIsActionComplete,
      setPreviousTxn: setPreviousTxn,
      setIsLoading: setIsTransactionExecuting,
      onComplete: onComplete,
      retryCallback: (multiStepToast: MultiStepToastHandle) =>
        retryCloseBalanceAction({ ...params, multiStepToast }, selectedBank),
      setAmountRaw: setAmountRaw,
    });
  }, [
    broadcastType,
    captureEvent,
    onComplete,
    priorityFees,
    retryCloseBalanceAction,
    selectedAccount,
    selectedBank,
    setAmountRaw,
    setIsActionComplete,
    setIsTransactionExecuting,
    setPreviousTxn,
  ]);

  ////////////////////
  // Lending Actions //
  ////////////////////
  const executeAction = async (
    params: MarginfiActionParams,
    selectedBank: ExtendedBankInfo,
    callbacks: {
      setIsActionComplete: (isComplete: boolean) => void;
      setPreviousTxn: (previousTxn: PreviousTxn) => void;
      setIsLoading: (isLoading: boolean) => void;
      captureEvent?: (event: string, properties?: Record<string, any>) => void;
      onComplete?: (previousTxn: PreviousTxn) => void;
      setLSTDialogCallback: (callback: () => void) => void;
      setAmountRaw: (amountRaw: string) => void;
      retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => void;
    }
  ) => {
    const action = async (params: MarginfiActionParams) => {
      await handleExecuteLendingAction({
        params,
        captureEvent: (event, properties) => {
          callbacks.captureEvent && callbacks.captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          callbacks.setIsActionComplete(true);
          callbacks.setPreviousTxn({
            txn: txnSigs.pop() ?? "",
            txnType: "LEND",
            lendingOptions: {
              amount: params.amount,
              type: params.actionType,
              bank: selectedBank as ActiveBankInfo,
            },
          });
          callbacks.onComplete &&
            callbacks.onComplete({
              txn: txnSigs.pop() ?? "",
              txnType: "LEND",
              lendingOptions: {
                amount: params.amount,
                type: params.actionType,
                bank: selectedBank as ActiveBankInfo,
              },
            });
        },
        setError: (error: IndividualFlowError) => {
          const toast = error.multiStepToast as MultiStepToastHandle;
          const txs = error.actionTxns as ActionTxns;
          const errorMessage = error.message;
          let retry = undefined;
          if (error.retry && toast && txs) {
            retry = () => callbacks.retryCallback(txs, toast);
          }
          toast.setFailed(errorMessage, retry);
        },
        setIsLoading: callbacks.setIsLoading,
      });
    };

    if (
      params.actionType === ActionType.Deposit &&
      (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL")
    ) {
      callbacks.setLSTDialogCallback(() => action);
      return;
    }

    await action(params);
    callbacks.setAmountRaw("");
  };

  // TODO: remove selectedBank, use params.bank instead

  const retryLendingAction = React.useCallback(
    (params: MarginfiActionParams, selectedBank: ExtendedBankInfo) => {
      executeAction(params, selectedBank, {
        captureEvent: captureEvent,
        setIsActionComplete: setIsActionComplete,
        setPreviousTxn: setPreviousTxn,
        onComplete: onComplete,
        setIsLoading: setIsTransactionExecuting,
        setLSTDialogCallback: setLSTDialogCallback,
        setAmountRaw: setAmountRaw,
        retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
          retryLendingAction({ ...params, actionTxns: txns, multiStepToast }, selectedBank);
        },
      });
    },
    [captureEvent, setIsActionComplete, setPreviousTxn, onComplete, setIsTransactionExecuting, setAmountRaw]
  );

  const handleLendingAction = React.useCallback(
    async (_actionTxns?: ActionTxns, multiStepToast?: MultiStepToastHandle) => {
      if (!selectedBank || !amount || !broadcastType || !priorityFees) {
        return;
      }

      const params: MarginfiActionParams = {
        marginfiClient,
        actionType: lendMode,
        bank: selectedBank,
        amount,
        nativeSolBalance,
        marginfiAccount: selectedAccount,
        walletContextState,
        actionTxns: _actionTxns ?? actionTxns,
        processOpts: { ...priorityFees, broadcastType },
        multiStepToast,
      };

      executeAction(params, selectedBank, {
        captureEvent: captureEvent,
        setIsActionComplete: setIsActionComplete,
        setPreviousTxn: setPreviousTxn,
        onComplete: onComplete,
        setIsLoading: setIsTransactionExecuting,
        setLSTDialogCallback: setLSTDialogCallback,
        setAmountRaw: setAmountRaw,
        retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
          retryLendingAction({ ...params, actionTxns: txns, multiStepToast }, selectedBank);
        },
      });
    },
    [
      actionTxns,
      amount,
      broadcastType,
      captureEvent,
      lendMode,
      marginfiClient,
      nativeSolBalance,
      onComplete,
      priorityFees,
      retryLendingAction,
      selectedAccount,
      selectedBank,
      setAmountRaw,
      setIsActionComplete,
      setIsTransactionExecuting,
      setPreviousTxn,
      walletContextState,
    ]
  );

  React.useEffect(() => {
    if (marginfiClient) {
      refreshSelectedBanks(banks);
    }
  }, [marginfiClient, banks, refreshSelectedBanks]);

  return (
    <>
      <div className="mb-4">
        <ActionInput
          banks={banks}
          nativeSolBalance={nativeSolBalance}
          walletAmount={walletAmount}
          amountRaw={amountRaw}
          amount={debouncedAmount}
          maxAmount={maxAmount}
          connected={connected}
          selectedBank={selectedBank}
          lendMode={lendMode}
          isDialog={isDialog}
          showTokenSelection={showTokenSelection}
          showTokenSelectionGroups={showTokenSelectionGroups}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedBank}
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
          // showCloseBalance={showCloseBalance}
          handleAction={() => {
            showCloseBalance ? handleCloseBalance() : handleLendingAction();
          }}
          buttonLabel={buttonLabel}
        />
      </div>

      <ActionSimulationStatus
        simulationStatus={isSimulating.status}
        hasErrorMessages={additionalActionMessages.length > 0}
        isActive={selectedBank && amount > 0 ? true : false}
      />

      <Preview
        actionSummary={actionSummary}
        selectedBank={selectedBank}
        isLoading={isLoading}
        lendMode={lendMode}
        hidePoolStats={hidePoolStats}
      />

      <LSTDialog
        variant={selectedBank?.meta.tokenSymbol as LSTDialogVariants}
        open={!!lstDialogCallback}
        onClose={() => {
          if (lstDialogCallback) {
            lstDialogCallback();
            setLSTDialogCallback(null);
          }
        }}
        banks={banks}
      />
    </>
  );
};
