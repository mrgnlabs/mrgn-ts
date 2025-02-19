import React from "react";
import { v4 as uuidv4 } from "uuid";

import {
  ActiveBankInfo,
  ExtendedBankInfo,
  ActionType,
  AccountSummary,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
} from "@mrgnlabs/marginfi-v2-ui-state";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  ExecuteDepositSwapActionProps,
  IndividualFlowError,
  MultiStepToastHandle,
  PreviousTxn,
  DepositSwapActionTxns,
  checkDepositSwapActionAvailable,
  usePrevious,
  executeDepositSwapAction,
  ExecuteDepositSwapActionPropsV2,
  ExecuteDepositSwapActionV2,
} from "@mrgnlabs/mrgn-utils";

import {
  ActionBoxContentWrapper,
  ActionButton,
  ActionCollateralProgressBar,
  ActionSettingsButton,
} from "~/components/action-box-v2/components";
import { LSTDialog, LSTDialogVariants } from "~/components/LSTDialog";
import { ActionMessage, Settings } from "~/components";

import { ActionSimulationStatus } from "../../components";
import { SimulationStatus } from "../../utils";
import { useDepositSwapActionAmounts, useDepositSwapSimulation } from "./hooks";
import { useActionBoxStore } from "../../store";
import { useActionContext, HidePoolStats } from "../../contexts";

import { getBankByPk, getBankOrWalletTokenByPk, handleExecuteDepositSwapAction } from "./utils";
import { useDepositSwapBoxStore } from "./store";
import { ActionInput, Preview } from "./components";
import { nativeToUi, WalletToken } from "@mrgnlabs/mrgn-common";

import { IconSettings } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

export type DepositSwapBoxProps = {
  nativeSolBalance: number;
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
  displaySettings?: boolean;

  walletTokens: WalletToken[] | null;
  allBanks?: ExtendedBankInfo[];

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
  setDisplaySettings?: (displaySettings: boolean) => void;
};

export const DepositSwapBox = ({
  nativeSolBalance,
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
  walletTokens,
  allBanks,
  displaySettings,
  setDisplaySettings,
}: DepositSwapBoxProps) => {
  const [
    amountRaw,
    lendMode,
    actionTxns,
    simulationResult,
    errorMessage,

    refreshState,
    fetchActionBoxState,
    setAmountRaw,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,

    setSelectedDepositBankPk,
    setSelectedSwapBankPk,

    selectedDepositBankPk,
    selectedSwapBankPk,
  ] = useDepositSwapBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.lendMode,
    state.actionTxns,
    state.simulationResult,
    state.errorMessage,

    state.refreshState,
    state.fetchActionBoxState,
    state.setAmountRaw,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,

    state.setSelectedDepositBankPk,
    state.setSelectedSwapBankPk,

    state.selectedDepositBankPk,
    state.selectedSwapBankPk,
  ]);

  const selectedDepositBank = React.useMemo(() => {
    return getBankByPk(banks, selectedDepositBankPk);
  }, [banks, selectedDepositBankPk]);

  const selectedSwapBank = React.useMemo(() => {
    return getBankOrWalletTokenByPk(banks, walletTokens, selectedSwapBankPk);
  }, [banks, walletTokens, selectedSwapBankPk]);

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

  const accountSummary = React.useMemo(() => {
    return (
      accountSummaryArg ?? (selectedAccount ? computeAccountSummary(selectedAccount, banks) : DEFAULT_ACCOUNT_SUMMARY)
    );
  }, [accountSummaryArg, selectedAccount, banks]);

  const [setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.setPreviousTxn,
    state.setIsActionComplete,
  ]);

  const isDust = React.useMemo(
    () => selectedDepositBank?.isActive && selectedDepositBank?.position.isDust,
    [selectedDepositBank]
  );
  const showCloseBalance = React.useMemo(
    () => (lendMode === ActionType.Withdraw && isDust) || false,
    [lendMode, isDust]
  );

  const { amount, debouncedAmount, walletAmount, maxAmount } = useDepositSwapActionAmounts({
    amountRaw,
    selectedBank: selectedSwapBank ?? selectedDepositBank,
    nativeSolBalance,
    actionMode: lendMode,
    walletTokens,
  });
  const actionMessages = React.useMemo(() => {
    return checkDepositSwapActionAvailable({
      amount,
      connected,
      showCloseBalance,
      depositBank: selectedDepositBank,
      swapBank: selectedSwapBank,
      banks,
      marginfiAccount: selectedAccount,
      nativeSolBalance,
      lendMode,
      allBanks,
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
    allBanks,
  ]);

  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

  const { actionSummary, refreshSimulation } = useDepositSwapSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    accountSummary,
    depositBank: selectedDepositBank ?? null,
    swapBank: selectedSwapBank ?? null,
    actionTxns,
    simulationResult,
    jupiterOptions,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading: setIsSimulating,
    marginfiClient,
    isDisabled: actionMessages.some((message) => !message.isEnabled),
  });

  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

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
      setActionTxns({ transactions: [], actionQuote: null });
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

  const buttonLabel = React.useMemo(() => (showCloseBalance ? "Close" : lendMode), [showCloseBalance, lendMode]);

  /*
  Cleaing additional action messages when the bank or amount changes. This is to prevent outdated errors from being displayed.
  */
  const prevSelectedBankPk = usePrevious(selectedDepositBankPk);
  const prevSwapBankPk = usePrevious(selectedSwapBankPk);
  const prevAmount = usePrevious(amount);

  React.useEffect(() => {
    if (
      prevSelectedBankPk &&
      prevSwapBankPk &&
      prevAmount &&
      (prevSelectedBankPk !== selectedDepositBankPk || prevSwapBankPk !== selectedSwapBankPk || prevAmount !== amount)
    ) {
      setErrorMessage(null);
      setActionTxns({ transactions: [], actionQuote: null });
      setSimulationResult(null);
    }
  }, [
    prevSelectedBankPk,
    prevSwapBankPk,
    prevAmount,
    selectedDepositBankPk,
    selectedSwapBankPk,
    amount,
    setErrorMessage,
    setActionTxns,
    setSimulationResult,
  ]);

  ///////////////////////
  // Deposit-Swap Actions //
  ///////////////////////
  // const executeAction = async (
  //   params: ExecuteDepositSwapActionProps,
  //   callbacks: {
  //     captureEvent?: (event: string, properties?: Record<string, any>) => void;
  //     setIsLoading: (loading: boolean) => void;
  //     handleOnComplete: (txnSigs: string[]) => void;
  //     retryCallback: (txns: DepositSwapActionTxns, multiStepToast: MultiStepToastHandle) => void;
  //     setAmountRaw: (amountRaw: string) => void;
  //   }
  // ) => {
  //   const action = async (params: ExecuteDepositSwapActionProps) => {
  //     await handleExecuteDepositSwapAction({
  //       params,
  //       captureEvent: (event, properties) => {
  //         callbacks.captureEvent && callbacks.captureEvent(event, properties);
  //       },
  //       setIsLoading: callbacks.setIsLoading,
  //       setIsComplete: callbacks.handleOnComplete,
  //       setError: (error: IndividualFlowError) => {
  //         const toast = error.multiStepToast as MultiStepToastHandle;
  //         const txs = error.actionTxns as DepositSwapActionTxns;
  //         const errorMessage = error.message;
  //         let retry = undefined;
  //         if (error.retry && toast && txs) {
  //           retry = () => callbacks.retryCallback(txs, toast);
  //         }
  //         toast?.setFailed(errorMessage, retry);
  //         callbacks.setIsLoading(false);
  //       },
  //     });
  //   };

  //   await action(params);
  //   callbacks.setAmountRaw("");
  // };

  // const retryDepositSwapAction = React.useCallback(
  //   async (params: ExecuteDepositSwapActionProps, swapBank: ExtendedBankInfo | WalletToken | null) => {
  //     executeAction(params, {
  //       captureEvent: captureEvent,
  //       setIsLoading: setIsTransactionExecuting,
  //       handleOnComplete: (txnSigs: string[]) => {
  //         setIsActionComplete(true);
  //         setPreviousTxn({
  //           txn: txnSigs[txnSigs.length - 1] ?? "",
  //           txnType: "DEPOSIT_SWAP",
  //           depositSwapOptions: {
  //             depositBank: selectedDepositBank as ActiveBankInfo,
  //             swapBank: selectedSwapBank as ActiveBankInfo,
  //             depositAmount: actionTxns?.actionQuote
  //               ? Number(
  //                   nativeToUi(actionTxns.actionQuote?.outAmount, selectedDepositBank?.info.rawBank.mintDecimals ?? 9)
  //                 )
  //               : debouncedAmount ?? 0,
  //             swapAmount: actionTxns?.actionQuote ? debouncedAmount ?? 0 : 0,
  //           },
  //         });
  //         onComplete &&
  //           onComplete({
  //             txn: txnSigs[txnSigs.length - 1] ?? "",
  //             txnType: "DEPOSIT_SWAP",
  //             depositSwapOptions: {
  //               depositBank: selectedDepositBank as ActiveBankInfo,
  //               swapBank: selectedSwapBank as ActiveBankInfo,
  //               depositAmount: actionTxns?.actionQuote
  //                 ? Number(
  //                     nativeToUi(actionTxns.actionQuote?.outAmount, selectedDepositBank?.info.rawBank.mintDecimals ?? 9)
  //                   )
  //                 : debouncedAmount ?? 0,
  //               swapAmount: actionTxns?.actionQuote ? debouncedAmount ?? 0 : 0,
  //               walletToken: walletTokens?.find(
  //                 (token) => token.address.toBase58() === selectedSwapBank?.address.toBase58()
  //               ),
  //             },
  //           });
  //       },
  //       retryCallback: (txns: DepositSwapActionTxns, multiStepToast: MultiStepToastHandle) => {
  //         retryDepositSwapAction({ ...params, actionTxns: txns, multiStepToast }, swapBank);
  //       },
  //       setAmountRaw: setAmountRaw,
  //     });
  //   },
  //   [
  //     actionTxns.actionQuote,
  //     captureEvent,
  //     debouncedAmount,
  //     onComplete,
  //     selectedDepositBank,
  //     selectedSwapBank,
  //     setIsActionComplete,
  //     setPreviousTxn,
  //     walletTokens,
  //     setAmountRaw,
  //   ]
  // );

  // const handleDepositSwapAction = React.useCallback(async () => {
  //   if (
  //     !actionTxns ||
  //     !marginfiClient ||
  //     !debouncedAmount ||
  //     debouncedAmount === 0 ||
  //     !transactionSettings ||
  //     !selectedAccount
  //   ) {
  //     return;
  //   }

  //   const params = {
  //     marginfiClient: marginfiClient,
  //     actionTxns: actionTxns,
  //     bank: selectedDepositBank,
  //     amount: debouncedAmount,
  //     nativeSolBalance,
  //     marginfiAccount: selectedAccount,
  //     processOpts: {
  //       ...priorityFees,
  //       broadcastType: transactionSettings.broadcastType,
  //     },
  //     txOpts: {},
  //     actionType: lendMode,
  //     swapBank: selectedSwapBank,
  //   } as ExecuteDepositSwapActionProps;

  //   await executeAction(params, {
  //     captureEvent: captureEvent,
  //     setIsLoading: setIsTransactionExecuting,
  //     handleOnComplete: (txnSigs: string[]) => {
  //       setIsActionComplete(true);
  //       setPreviousTxn({
  //         txn: txnSigs[txnSigs.length - 1] ?? "",
  //         txnType: "DEPOSIT_SWAP",
  //         depositSwapOptions: {
  //           depositBank: selectedDepositBank as ActiveBankInfo,
  //           swapBank: selectedSwapBank as ActiveBankInfo,
  //           depositAmount: actionTxns?.actionQuote
  //             ? Number(
  //                 nativeToUi(actionTxns.actionQuote?.outAmount, selectedDepositBank?.info.rawBank.mintDecimals ?? 9)
  //               )
  //             : debouncedAmount,
  //           swapAmount: actionTxns?.actionQuote ? debouncedAmount : 0,
  //         },
  //       });
  //       onComplete &&
  //         onComplete({
  //           txn: txnSigs[txnSigs.length - 1] ?? "",
  //           txnType: "DEPOSIT_SWAP",
  //           depositSwapOptions: {
  //             depositBank: selectedDepositBank as ActiveBankInfo,
  //             swapBank: selectedSwapBank as ActiveBankInfo,
  //             depositAmount: actionTxns?.actionQuote
  //               ? Number(
  //                   nativeToUi(actionTxns.actionQuote?.outAmount, selectedDepositBank?.info.rawBank.mintDecimals ?? 9)
  //                 )
  //               : debouncedAmount,
  //             swapAmount: actionTxns?.actionQuote ? debouncedAmount : 0,
  //             walletToken: walletTokens?.find(
  //               (token) => token.address.toBase58() === selectedSwapBank?.address.toBase58()
  //             ),
  //           },
  //         });
  //     },
  //     retryCallback: (txns: DepositSwapActionTxns, multiStepToast: MultiStepToastHandle) => {
  //       retryDepositSwapAction({ ...params, actionTxns: txns, multiStepToast }, selectedSwapBank);
  //     },
  //     setAmountRaw: setAmountRaw,
  //   });
  // }, [
  //   actionTxns,
  //   marginfiClient,
  //   debouncedAmount,
  //   transactionSettings,
  //   selectedAccount,
  //   selectedDepositBank,
  //   nativeSolBalance,
  //   priorityFees,
  //   lendMode,
  //   selectedSwapBank,
  //   captureEvent,
  //   setIsActionComplete,
  //   setPreviousTxn,
  //   onComplete,
  //   walletTokens,
  //   retryDepositSwapAction,
  //   setAmountRaw,
  // ]);

  const handleDepositSwapAction = React.useCallback(() => {
    if (!marginfiClient) return;

    const attemptUuid = uuidv4();

    const props: ExecuteDepositSwapActionPropsV2 = {
      actionTxns,
      attemptUuid,
      marginfiClient,
      processOpts: {
        ...priorityFees,
        broadcastType: transactionSettings?.broadcastType,
      },
      txOpts: {},
      callbacks: {
        captureEvent: captureEvent ?? (() => {}), // TODO: fix undefined case here
      },
      infoProps: {
        depositToken: selectedDepositBank?.meta.tokenSymbol ?? "",
        swapToken: selectedSwapBank
          ? "info" in selectedSwapBank
            ? selectedSwapBank.meta.tokenSymbol
            : selectedSwapBank.symbol
          : "NO_SWAP",
        amount: debouncedAmount ?? 0,
      },
    };

    ExecuteDepositSwapActionV2(props);
    setAmountRaw("");
  }, [
    actionTxns,
    marginfiClient,
    priorityFees,
    transactionSettings,
    captureEvent,
    selectedDepositBank,
    selectedSwapBank,
    debouncedAmount,
    setAmountRaw,
  ]);

  return (
    <ActionBoxContentWrapper>
      <div className="space-y-1 mb-4">
        <span className="text-sm text-muted-foreground">
          {!requestedDepositBank ||
          (selectedDepositBank &&
            selectedSwapBank &&
            selectedDepositBank.meta.tokenSymbol ===
              ("info" in selectedSwapBank ? selectedSwapBank.info.state.mint.toBase58() : selectedSwapBank.symbol))
            ? "Swap"
            : "Swap & Deposit"}
        </span>
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
          setSelectedBank={(bank) => {
            const bankPk = bank?.address;
            if (!bankPk) {
              setSelectedSwapBankPk(null);
              return;
            }

            if (selectedDepositBankPk?.equals(bankPk) && !requestedSwapBank) {
              setSelectedSwapBankPk(bankPk);
              setSelectedDepositBankPk(null);
            } else {
              setSelectedSwapBankPk(bankPk);
            }
          }}
          walletTokens={walletTokens}
          showOnlyUserOwnedTokens={true}
        />
      </div>

      {!requestedDepositBank && (
        <div className="space-y-1 mb-4">
          <p className="text-sm text-muted-foreground">Deposit</p>
          <ActionInput
            banks={banks.filter(
              (bank) =>
                bank.info.rawBank.mint.toBase58() !==
                (selectedSwapBank && "info" in selectedSwapBank
                  ? selectedSwapBank?.info.rawBank.mint.toBase58()
                  : selectedSwapBank?.address.toBase58())
            )}
            nativeSolBalance={nativeSolBalance}
            walletAmount={walletAmount}
            amountRaw={
              isNaN(Number(actionTxns?.actionQuote?.outAmount))
                ? ""
                : nativeToUi(
                    Number(actionTxns?.actionQuote?.outAmount),
                    selectedDepositBank?.info.rawBank.mintDecimals ?? 9
                  ).toString()
            } // clean
            amount={
              isNaN(Number(actionTxns?.actionQuote?.outAmount))
                ? 0
                : nativeToUi(
                    Number(actionTxns?.actionQuote?.outAmount),
                    selectedDepositBank?.info.rawBank.mintDecimals ?? 9
                  )
            } // clean
            maxAmount={maxAmount}
            connected={connected}
            selectedBank={selectedDepositBank ?? null}
            lendMode={lendMode}
            isDialog={isDialog}
            showTokenSelection={showTokenSelection}
            showTokenSelectionGroups={showTokenSelectionGroups}
            setAmountRaw={setAmountRaw}
            setSelectedBank={(bank) => {
              const bankPk = bank?.address;
              if (!bankPk) {
                setSelectedDepositBankPk(null);
                return;
              }

              if (selectedSwapBankPk?.equals(bankPk) && !requestedDepositBank) {
                setSelectedDepositBankPk(bankPk);
                setSelectedSwapBankPk(null);
              } else {
                setSelectedDepositBankPk(bankPk);
              }
            }}
            isInputDisabled={true}
            showOnlyUserOwnedTokens={false}
          />
        </div>
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
          // showCloseBalance={showCloseBalance}
          handleAction={() => {
            handleDepositSwapAction();
          }}
          buttonLabel={buttonLabel}
        />
      </div>

      <div className="flex items-center justify-between">
        <ActionSimulationStatus
          simulationStatus={isSimulating.status}
          hasErrorMessages={additionalActionMessages.length > 0}
          isActive={selectedDepositBank && amount > 0 ? true : false}
        />
        {setDisplaySettings && <ActionSettingsButton onClick={() => setDisplaySettings(true)} />}
      </div>

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
            lstDialogCallback();
            setLSTDialogCallback(null);
          }
        }}
        banks={banks}
      />
    </ActionBoxContentWrapper>
  );
};
