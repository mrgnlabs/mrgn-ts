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

import { MarginfiAccount, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  ActionTxns,
  checkSwapLendActionAvailable,
  ClosePositionActionTxns,
  IndividualFlowError,
  MarginfiActionParams,
  MultiStepToastHandle,
  PreviousTxn,
} from "@mrgnlabs/mrgn-utils";

import { ActionButton } from "~/components/action-box-v2/components";
import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { LSTDialog, LSTDialogVariants } from "~/components/LSTDialog";
import { ActionMessage } from "~/components";

import { useSwapLendBoxStore } from "./store";
// import { HandleCloseBalanceParamsProps, handleExecuteCloseBalance, handleExecuteLendingAction } from "./utils";
import { ActionSimulationStatus } from "../../components";
import { Collateral, ActionInput, Preview } from "./components";
import { SimulationStatus } from "../../utils";
import { useSwapLendSimulation } from "./hooks";
import { useActionBoxStore } from "../../store";
import { HidePoolStats } from "../../contexts/actionbox/actionbox.context";
import { useActionContext } from "../../contexts";
import { handleExecuteSwapLendAction } from "./utils";

// error handling
export type SwapLendBoxProps = {
  nativeSolBalance: number;
  // tokenAccountMap: TokenAccountMap;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedDepositBank?: ExtendedBankInfo;
  requestedSwapBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;
  showAvailableCollateral?: boolean;
  showTokenSelection?: boolean;
  showTokenSelectionGroups?: boolean;
  hidePoolStats?: HidePoolStats;

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const SwapLendBox = ({
  nativeSolBalance,
  // tokenAccountMap,
  connected,
  marginfiClient,
  banks,
  selectedAccount,
  accountSummaryArg,
  isDialog,
  showTokenSelection,
  showAvailableCollateral = true,
  showTokenSelectionGroups,
  requestedDepositBank,
  requestedSwapBank,
  onComplete,
  captureEvent,
  hidePoolStats,
}: SwapLendBoxProps) => {
  const [
    amountRaw,
    lendMode,
    actionTxns,
    selectedDepositBank,
    selectedSwapBank,
    simulationResult,
    errorMessage,

    refreshState,
    fetchActionBoxState,
    setLendMode,
    setAmountRaw,
    setSelectedDepositBank,
    setSelectedSwapBank,
    refreshBanks,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
  ] = useSwapLendBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.lendMode,
    state.actionTxns,
    state.selectedDepositBank,
    state.selectedSwapBank,
    state.simulationResult,
    state.errorMessage,

    state.refreshState,
    state.fetchActionBoxState,
    state.setLendMode,
    state.setAmountRaw,
    state.setSelectedDepositBank,
    state.setSelectedSwapBank,
    state.refreshBanks,
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
    selectedBank: selectedSwapBank ?? selectedDepositBank,
    nativeSolBalance,
    actionMode: lendMode,
  });
  const { actionSummary, refreshSimulation } = useSwapLendSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    accountSummary,
    depositBank: selectedDepositBank ?? null,
    swapBank: selectedSwapBank ?? null,
    actionTxns,
    simulationResult,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading: setIsSimulating,
    marginfiClient,
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
    if (debouncedAmount === 0 && simulationResult) {
      setActionTxns({ actionTxn: null, additionalTxns: [] });
      setSimulationResult(null);
    }
  }, [simulationResult, debouncedAmount, setActionTxns, setSimulationResult]);

  React.useEffect(() => {
    fetchActionBoxState({
      requestedLendType: ActionType.Deposit,
      depositBank: requestedDepositBank,
      swapBank: requestedSwapBank,
    });
  }, [requestedDepositBank, requestedSwapBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      setAdditionalActionMessages([errorMessage]);
    } else {
      setAdditionalActionMessages([]);
    }
  }, [errorMessage]);

  const isDust = React.useMemo(
    () => selectedDepositBank?.isActive && selectedDepositBank?.position.isDust,
    [selectedDepositBank]
  );
  const showCloseBalance = React.useMemo(
    () => (lendMode === ActionType.Withdraw && isDust) || false,
    [lendMode, isDust]
  );

  const actionMessages = React.useMemo(() => {
    setAdditionalActionMessages([]);
    return checkSwapLendActionAvailable({
      amount,
      connected,
      showCloseBalance,
      depositBank: selectedDepositBank,
      swapBank: selectedSwapBank,
      banks,
      marginfiAccount: selectedAccount,
      nativeSolBalance,
      lendMode,
    });
  }, [
    amount,
    connected,
    showCloseBalance,
    selectedDepositBank,
    selectedSwapBank,
    banks,
    selectedAccount,
    nativeSolBalance,
    lendMode,
  ]);

  const buttonLabel = React.useMemo(() => (showCloseBalance ? "Close" : lendMode), [showCloseBalance, lendMode]);

  ///////////////////////
  // Swap-Lend Actions //
  ///////////////////////
  const executeAction = async (
    params: MarginfiActionParams,
    swapBank: ExtendedBankInfo | null,
    callbacks: {
      captureEvent?: (event: string, properties?: Record<string, any>) => void;
      setIsLoading: (loading: boolean) => void;
      handleOnComplete: (txnSigs: string[]) => void;
      retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => void;
    }
  ) => {
    const action = async (params: MarginfiActionParams) => {
      handleExecuteSwapLendAction({
        params,
        swapBank,
        captureEvent: (event, properties) => {
          callbacks.captureEvent && callbacks.captureEvent(event, properties);
        },
        setIsLoading: callbacks.setIsLoading,
        setIsComplete: callbacks.handleOnComplete,
        setError: (error: IndividualFlowError) => {
          const toast = error.multiStepToast as MultiStepToastHandle;
          const txs = error.actionTxns as ActionTxns;
          const errorMessage = error.message;
          let retry = undefined;
          if (error.retry && toast && txs) {
            retry = () => callbacks.retryCallback(txs, toast);
          }
          toast?.setFailed(errorMessage, retry);
          callbacks.setIsLoading(false);
        },
      });
    };
    await action(params);
  };

  const retrySwapLendAction = React.useCallback(
    async (params: MarginfiActionParams, swapBank: ExtendedBankInfo | null) => {
      executeAction(params, swapBank, {
        captureEvent: captureEvent,
        setIsLoading: setIsTransactionExecuting,
        handleOnComplete: (txnSigs: string[]) => {
          setIsActionComplete(true);
          setPreviousTxn({
            txn: txnSigs[txnSigs.length - 1] ?? "",
            txnType: "SWAP_LEND",
            swapLendOptions: {
              depositBank: selectedDepositBank as ActiveBankInfo,
              swapBank: selectedSwapBank as ActiveBankInfo,
              depositAmount: 0, // TODO
              swapAmount: 0, // TODO
            },
          });
          onComplete &&
            onComplete({
              txn: txnSigs[txnSigs.length - 1] ?? "",
              txnType: "SWAP_LEND",
              swapLendOptions: {
                depositBank: selectedDepositBank as ActiveBankInfo,
                swapBank: selectedSwapBank as ActiveBankInfo,
                depositAmount: 0, // TODO
                swapAmount: 0, // TODO
              },
            });
        },
        retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
          retrySwapLendAction({ ...params, actionTxns: txns, multiStepToast }, swapBank);
        },
      });
    },
    [captureEvent, onComplete, selectedDepositBank, selectedSwapBank, setIsActionComplete, setPreviousTxn]
  );

  const handleSwapLendAction = React.useCallback(
    async (_actionTxns?: ActionTxns, multiStepToast?: MultiStepToastHandle) => {
      console.log(selectedAccount);
      if (!actionTxns || !marginfiClient || !debouncedAmount) {
        console.log({ actionTxns, marginfiClient, selectedSwapBank });
        return;
      }

      const params = {
        marginfiClient: marginfiClient,
        actionTxns: _actionTxns ?? actionTxns,
        bank: selectedDepositBank,
        amount: debouncedAmount,
        nativeSolBalance,
        marginfiAccount: selectedAccount,
        processOpts: {
          ...priorityFees,
          broadcastType,
        },
        txOpts: {},
        multiStepToast,
      } as MarginfiActionParams;

      await executeAction(params, selectedSwapBank, {
        captureEvent: captureEvent,
        setIsLoading: setIsTransactionExecuting,
        handleOnComplete: (txnSigs: string[]) => {
          setIsActionComplete(true);
          setPreviousTxn({
            txn: txnSigs[txnSigs.length - 1] ?? "",
            txnType: "SWAP_LEND",
            swapLendOptions: {
              depositBank: selectedDepositBank as ActiveBankInfo,
              swapBank: selectedSwapBank as ActiveBankInfo,
              depositAmount: debouncedAmount,
              swapAmount: 0, // TODO
            },
          });
          onComplete &&
            onComplete({
              txn: txnSigs[txnSigs.length - 1] ?? "",
              txnType: "SWAP_LEND",
              swapLendOptions: {
                depositBank: selectedDepositBank as ActiveBankInfo,
                swapBank: selectedSwapBank as ActiveBankInfo,
                depositAmount: debouncedAmount,
                swapAmount: 0, // TODO
              },
            });
        },
        retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
          retrySwapLendAction({ ...params, actionTxns: txns, multiStepToast }, selectedSwapBank);
        },
      });
    },
    [
      actionTxns,
      marginfiClient,
      selectedSwapBank,
      selectedDepositBank,
      debouncedAmount,
      nativeSolBalance,
      selectedAccount,
      priorityFees,
      broadcastType,
      captureEvent,
      setIsActionComplete,
      setPreviousTxn,
      onComplete,
      retrySwapLendAction,
    ]
  );

  React.useEffect(() => {
    if (marginfiClient) {
      refreshBanks(banks);
    }
  }, [marginfiClient, banks, refreshBanks]);

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
          selectedBank={selectedSwapBank ?? selectedDepositBank ?? null}
          lendMode={lendMode}
          isDialog={isDialog}
          showTokenSelection={showTokenSelection}
          showTokenSelectionGroups={showTokenSelectionGroups}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedSwapBank}
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
            handleSwapLendAction();
          }}
          buttonLabel={buttonLabel}
        />
      </div>

      <ActionSimulationStatus
        simulationStatus={isSimulating.status}
        hasErrorMessages={additionalActionMessages.length > 0}
        isActive={selectedDepositBank && amount > 0 ? true : false}
      />

      <Preview
        actionSummary={actionSummary}
        selectedBank={selectedDepositBank}
        isLoading={isLoading}
        lendMode={lendMode}
        hidePoolStats={hidePoolStats}
      />

      <LSTDialog
        variant={selectedDepositBank?.meta.tokenSymbol as LSTDialogVariants}
        open={!!lstDialogCallback}
        onClose={() => {
          if (lstDialogCallback) {
            console.log("lstDialogCallback");
            lstDialogCallback();
            setLSTDialogCallback(null);
          }
        }}
        banks={banks}
      />
    </>
  );
};
