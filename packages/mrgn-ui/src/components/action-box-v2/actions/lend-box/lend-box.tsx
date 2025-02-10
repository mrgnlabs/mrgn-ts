import React from "react";

import Link from "next/link";

import { WalletContextState } from "@solana/wallet-adapter-react";
import { IconInfoCircle, IconSettings } from "@tabler/icons-react";

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
import { ValidatorStakeGroup } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionMessageType,
  ActionTxns,
  checkLendActionAvailable,
  IndividualFlowError,
  MarginfiActionParams,
  MultiStepToastHandle,
  PreviousTxn,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";

import {
  ActionBoxContentWrapper,
  ActionButton,
  ActionCollateralProgressBar,
} from "~/components/action-box-v2/components";
import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { LSTDialog, LSTDialogVariants } from "~/components/LSTDialog";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ActionMessage } from "~/components";

import { useLendBoxStore } from "./store";
import { HandleCloseBalanceParamsProps, handleExecuteCloseBalance, handleExecuteLendingAction } from "./utils";
import { ActionSimulationStatus } from "../../components";
import { Collateral, ActionInput, Preview, StakeAccountSwitcher } from "./components";
import { SimulationStatus } from "../../utils";
import { useLendSimulation } from "./hooks";
import { useActionBoxStore } from "../../store";
import { HidePoolStats } from "../../contexts/actionbox/actionbox.context";
import { useActionContext } from "../../contexts";
import { PublicKey } from "@solana/web3.js";

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
  stakeAccounts?: ValidatorStakeGroup[];

  searchMode?: boolean;
  onCloseDialog?: () => void;
  setShouldBeHidden?: (hidden: boolean) => void;

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
  setDisplaySettings?: (displaySettings: boolean) => void;
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
  stakeAccounts,
  setDisplaySettings,
  onCloseDialog,
  searchMode = false,
  setShouldBeHidden,
}: LendBoxProps) => {
  const [
    amountRaw,
    lendMode,
    actionTxns,
    selectedBank,
    simulationResult,
    errorMessage,
    selectedStakeAccount,

    refreshState,
    fetchActionBoxState,
    setLendMode,
    setAmountRaw,
    setSelectedBank,
    refreshSelectedBanks,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setStakeAccounts,
    setSelectedStakeAccount,
  ] = useLendBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.lendMode,
    state.actionTxns,
    state.selectedBank,
    state.simulationResult,
    state.errorMessage,
    state.selectedStakeAccount,

    state.refreshState,
    state.fetchActionBoxState,
    state.setLendMode,
    state.setAmountRaw,
    state.setSelectedBank,
    state.refreshSelectedBanks,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.setStakeAccounts,
    state.setSelectedStakeAccount,
  ]);

  React.useEffect(() => {
    if (searchMode && !selectedBank) {
      setShouldBeHidden?.(true);
    } else {
      setShouldBeHidden?.(false);
    }
  }, [searchMode, selectedBank, setShouldBeHidden]);

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

  const { transactionSettings, priorityFees } = useActionContext() || { transactionSettings: null, priorityFees: null };

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
    selectedStakeAccount: selectedStakeAccount || undefined,
  });
  const { actionSummary, refreshSimulation } = useLendSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    accountSummary,
    selectedBank,
    lendMode,
    actionTxns,
    simulationResult,
    connection: marginfiClient?.provider.connection,
    selectedStakeAccount: selectedStakeAccount?.address || undefined,
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
    if (debouncedAmount === 0 && simulationResult) {
      setActionTxns({ transactions: [] });
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

  const actionMessages = React.useMemo(() => {
    return checkLendActionAvailable({
      amount,
      connected,
      showCloseBalance,
      selectedBank,
      banks,
      marginfiAccount: selectedAccount,
      nativeSolBalance,
      lendMode,
    });
  }, [amount, connected, showCloseBalance, selectedBank, banks, selectedAccount, nativeSolBalance, lendMode]);

  const buttonLabel = React.useMemo(() => (showCloseBalance ? "Close" : lendMode), [showCloseBalance, lendMode]);

  /*
  Cleaing additional action messages when the bank or amount changes. This is to prevent outdated errors from being displayed.
  */
  const prevSelectedBank = usePrevious(selectedBank);
  const prevAmount = usePrevious(amount);

  React.useEffect(() => {
    if (
      prevSelectedBank &&
      prevAmount &&
      (prevSelectedBank.meta.tokenSymbol !== selectedBank?.meta.tokenSymbol || prevAmount !== amount)
    ) {
      setAdditionalActionMessages([]);
      setErrorMessage(null);
    }
  }, [prevSelectedBank, prevAmount, selectedBank, amount, setErrorMessage]);

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
    if (!selectedBank || !selectedAccount || !transactionSettings) {
      return;
    }

    const params = {
      bank: selectedBank,
      marginfiAccount: selectedAccount,
      processOpts: { ...priorityFees, broadcastType: transactionSettings.broadcastType },
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
    transactionSettings,
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
    const action = async (params: MarginfiActionParams) =>
      handleExecuteLendingAction({
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
          toast && toast.setFailed(errorMessage, retry);
          callbacks.setIsLoading(false);
        },
        setIsLoading: callbacks.setIsLoading,
      });

    if (
      params.actionType === ActionType.Deposit &&
      (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL")
    ) {
      const actionFn = () => action(params);
      callbacks.setLSTDialogCallback(() => actionFn);
    } else {
      await action(params);
    }
  };

  // TODO: remove selectedBank, use params.bank instead

  const retryLendingAction = React.useCallback(
    async (params: MarginfiActionParams, selectedBank: ExtendedBankInfo) =>
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
      }),
    [captureEvent, setIsActionComplete, setPreviousTxn, onComplete, setIsTransactionExecuting, setAmountRaw]
  );

  const handleLendingAction = React.useCallback(
    async (_actionTxns?: ActionTxns, multiStepToast?: MultiStepToastHandle) => {
      if (!selectedBank || !amount || !transactionSettings) {
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
        processOpts: { ...priorityFees, broadcastType: transactionSettings.broadcastType },
        multiStepToast,
      };

      return await executeAction(params, selectedBank, {
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
      transactionSettings,
    ]
  );

  const hasErrorsWarnings = React.useMemo(() => {
    return (
      additionalActionMessages
        .concat(actionMessages)
        .filter((value) => value.actionMethod !== "INFO" && value.description).length > 0
    );
  }, [additionalActionMessages, actionMessages]);

  // store users stake accounts in state on load
  // selected stake account will be handled in lend store
  React.useEffect(() => {
    if (stakeAccounts) {
      setStakeAccounts(stakeAccounts);
    }
  }, [stakeAccounts, setStakeAccounts]);

  // set selected stake account on load
  // if requestedBank is set
  React.useEffect(() => {
    if (requestedBank && stakeAccounts) {
      const stakeAccount = stakeAccounts.find((stakeAccount) =>
        stakeAccount.validator.equals(requestedBank.meta.stakePool?.validatorVoteAccount || PublicKey.default)
      );
      if (stakeAccount) {
        setSelectedStakeAccount({
          address: stakeAccount.accounts[0].pubkey,
          balance: stakeAccount.accounts[0].amount,
        });
      }
    }
  }, [requestedBank, stakeAccounts, setSelectedStakeAccount]);

  React.useEffect(() => {
    if (marginfiClient) {
      refreshSelectedBanks(banks);
    }
  }, [marginfiClient, banks, refreshSelectedBanks]);

  return (
    <ActionBoxContentWrapper>
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
          searchMode={searchMode}
          onCloseDialog={() => {
            searchMode && onCloseDialog?.();
          }}
        />
      </div>
      {lendMode === ActionType.Deposit &&
        selectedBank &&
        selectedBank.info.rawBank.config.assetTag === 2 &&
        stakeAccounts &&
        stakeAccounts.length > 1 && (
          <StakeAccountSwitcher
            selectedBank={selectedBank}
            selectedStakeAccount={selectedStakeAccount?.address}
            stakeAccounts={stakeAccounts}
            onStakeAccountChange={(account) => {
              setSelectedStakeAccount(account);
              setAmountRaw("0");
            }}
          />
        )}
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
      <div className="flex items-center justify-between">
        <ActionSimulationStatus
          simulationStatus={isSimulating.status}
          hasErrorMessages={hasErrorsWarnings}
          isActive={selectedBank && amount > 0 ? true : false}
        />

        {setDisplaySettings && (
          <div className="flex justify-end gap-2 ml-auto">
            <button
              onClick={() => setDisplaySettings(true)}
              className="text-xs gap-1 h-6 px-2 flex items-center rounded-full bg-mfi-action-box-accent hover:bg-mfi-action-box-accent/80 "
            >
              Settings <IconSettings size={20} />
            </button>
          </div>
        )}
      </div>
      <Preview
        actionSummary={actionSummary}
        selectedBank={selectedBank}
        isLoading={isLoading}
        lendMode={lendMode}
        hidePoolStats={hidePoolStats}
      />
      {/* Add note regarding this epochs rewards for staked asset banks */}
      {lendMode === ActionType.Deposit &&
        selectedBank &&
        selectedBank.info.rawBank.config.assetTag === 2 &&
        amount > 0 &&
        amount === maxAmount && (
          <div className="mt-6 text-[11px] text-muted-foreground font-light">
            <p>*Accumulated Jito mev rewards may be withdrawn to your wallet on deposit</p>
          </div>
        )}
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
    </ActionBoxContentWrapper>
  );
};
