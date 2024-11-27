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
  MarginfiActionParams,
  MultiStepToastHandle,
  PreviousTxn,
} from "@mrgnlabs/mrgn-utils";

import { ActionButton } from "~/components/action-box-v2/components";

import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { LSTDialog, LSTDialogVariants } from "~/components/LSTDialog";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ActionMessage } from "~/components";

import { useLendBoxStore } from "./store";
import { HandleCloseBalanceParamsProps, handleExecuteCloseBalance, handleExecuteLendingAction } from "./utils";
import { Collateral, ActionInput, Preview } from "./components";
import { useLendSimulation } from "./hooks";
import { useActionBoxStore } from "../../store";
import { HidePoolStats } from "../../contexts/actionbox/actionbox.context";
import { useActionContext } from "../../contexts";

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
    isLoading,
    errorMessage,

    refreshState,
    fetchActionBoxState,
    setLendMode,
    setAmountRaw,
    setSelectedBank,
    refreshSelectedBanks,
    setSimulationResult,
    setActionTxns,
    setIsLoading,
    setErrorMessage,
  ] = useLendBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.lendMode,
    state.actionTxns,
    state.selectedBank,
    state.simulationResult,
    state.isLoading,
    state.errorMessage,

    state.refreshState,
    state.fetchActionBoxState,
    state.setLendMode,
    state.setAmountRaw,
    state.setSelectedBank,
    state.refreshSelectedBanks,
    state.setSimulationResult,
    state.setActionTxns,
    state.setIsLoading,
    state.setErrorMessage,
  ]);

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
  const { actionSummary } = useLendSimulation({
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
    setIsLoading,
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

  React.useEffect(() => {
    fetchActionBoxState({ requestedLendType, requestedBank });
  }, [requestedLendType, requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      setAdditionalActionMessages([errorMessage]);
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
          txn: txnSigs.pop() ?? "",
          txnType: "LEND",
          lendingOptions: {
            amount: 0,
            type: ActionType.Withdraw,
            bank: selectedBank as ActiveBankInfo,
          },
        });

        callbacks.onComplete &&
          callbacks.onComplete({
            txn: txnSigs.pop() ?? "",
            txnType: "LEND",
            lendingOptions: {
              amount: 0,
              type: ActionType.Withdraw,
              bank: selectedBank as ActiveBankInfo,
            },
          });
      },
      setError: (error: any) => {
        // todo: replace any type
        const toast = error.multiStepToast as MultiStepToastHandle;
        const txs = error.actionTxns as ActionTxns;
        const errorMessage = error.errorMessage;
        toast.setFailed(errorMessage, () => callbacks.retryCallback(toast));
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
        setIsLoading: setIsLoading,
        onComplete: onComplete,
        retryCallback: (multiStepToast: MultiStepToastHandle) =>
          retryCloseBalanceAction({ ...params, multiStepToast }, selectedBank),
        setAmountRaw: setAmountRaw,
      });
    },
    [captureEvent, onComplete, setAmountRaw, setIsActionComplete, setIsLoading, setPreviousTxn]
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
      setIsLoading: setIsLoading,
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
    setIsLoading,
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
        setError: (error) => {
          // TODO: update type
          const toast = error.multiStepToast as MultiStepToastHandle;
          const txs = error.actionTxns as ActionTxns;
          const errorMessage = error.errorMessage;
          toast.setFailed(errorMessage, () => callbacks.retryCallback(txs, toast));
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
        setIsLoading: setIsLoading,
        setLSTDialogCallback: setLSTDialogCallback,
        setAmountRaw: setAmountRaw,
        retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) =>
          retryLendingAction({ ...params, actionTxns: txns, multiStepToast }, selectedBank),
      });
    },
    [captureEvent, setIsActionComplete, setPreviousTxn, onComplete, setIsLoading, setAmountRaw]
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
        setIsLoading: setIsLoading,
        setLSTDialogCallback: setLSTDialogCallback,
        setAmountRaw: setAmountRaw,
        retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) =>
          retryLendingAction({ ...params, actionTxns: txns, multiStepToast }, selectedBank),
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
      setIsLoading,
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
      <div className="mb-6">
        <ActionInput
          banks={banks}
          nativeSolBalance={nativeSolBalance}
          walletAmount={walletAmount}
          amountRaw={amountRaw}
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
              <ActionMessage _actionMessage={actionMessage} />
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
