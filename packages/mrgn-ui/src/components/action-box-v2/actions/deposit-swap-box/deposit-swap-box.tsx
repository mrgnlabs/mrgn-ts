import React from "react";

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
} from "@mrgnlabs/mrgn-utils";

import {
  ActionBoxContentWrapper,
  ActionButton,
  ActionCollateralProgressBar,
} from "~/components/action-box-v2/components";
import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { LSTDialog, LSTDialogVariants } from "~/components/LSTDialog";
import { ActionMessage, Settings } from "~/components";

import { ActionSimulationStatus } from "../../components";
import { SimulationStatus } from "../../utils";
import { useDepositSwapActionAmounts, useDepositSwapSimulation } from "./hooks";
import { useActionBoxStore } from "../../store";
import { useActionContext, HidePoolStats } from "../../contexts";

import { handleExecuteDepositSwapAction } from "./utils";
import { useDepositSwapBoxStore } from "./store";
import { ActionInput, Preview } from "./components";
import { nativeToUi, WalletToken } from "@mrgnlabs/mrgn-common";

import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import { TooltipProvider } from "~/components/ui/tooltip";
import { IconInfoCircle } from "~/components/ui/icons";
import { IconSettings } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { PublicKey } from "@solana/web3.js";

// TODO: move to mrgn-common

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
  displaySettings,
  setDisplaySettings,
}: DepositSwapBoxProps) => {
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
    setAmountRaw,
    setSelectedDepositBank,
    setSelectedSwapBank,
    refreshBanks,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
  ] = useDepositSwapBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.lendMode,
    state.actionTxns,
    state.selectedDepositBank,
    state.selectedSwapBank,
    state.simulationResult,
    state.errorMessage,

    state.refreshState,
    state.fetchActionBoxState,
    state.setAmountRaw,
    state.setSelectedDepositBank,
    state.setSelectedSwapBank,
    state.refreshBanks,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
  ]);

  const [walletTokens, setWalletTokens] = React.useState<WalletToken[] | null>(null);

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

  const { amount, debouncedAmount, walletAmount, maxAmount } = useDepositSwapActionAmounts({
    amountRaw,
    selectedBank: selectedSwapBank ?? selectedDepositBank,
    nativeSolBalance,
    actionMode: lendMode,
  });
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
      setActionTxns({ actionTxn: null, additionalTxns: [], actionQuote: null });
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

  /////////////////////////////////
  // fetch wallet tokens actions //
  /////////////////////////////////
  const fetchWalletTokens = React.useCallback(async (wallet: PublicKey) => {
    try {
      const response = await fetch(`/api/user/wallet?wallet=${wallet.toBase58()}`);

      const data = await response.json();

      const mappedData = data.map((token: WalletToken) => {
        return {
          ...token,
          address: new PublicKey(token.address),
          ata: new PublicKey(token.ata),
        };
      });

      setWalletTokens(mappedData);
    } catch (error) {
      console.error("Failed to fetch wallet tokens:", error);
    }
  }, []);

  // Fetch on initial load
  React.useEffect(() => {
    if (!connected || !selectedAccount || walletTokens !== null) return;

    const walletPublicKey = selectedAccount.authority;
    fetchWalletTokens(walletPublicKey);
  }, [connected, selectedAccount, walletTokens, fetchWalletTokens]);

  // Fetch on refresh
  const handleRefreshWalletTokens = (walletPublicKey: PublicKey) => {
    fetchWalletTokens(walletPublicKey);
  };

  const isDust = React.useMemo(
    () => selectedDepositBank?.isActive && selectedDepositBank?.position.isDust,
    [selectedDepositBank]
  );
  const showCloseBalance = React.useMemo(
    () => (lendMode === ActionType.Withdraw && isDust) || false,
    [lendMode, isDust]
  );

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

  /*
  Cleaing additional action messages when the bank or amount changes. This is to prevent outdated errors from being displayed.
  */
  const prevSelectedBank = usePrevious(selectedDepositBank);
  const prevSwapBank = usePrevious(selectedSwapBank);
  const prevAmount = usePrevious(amount);

  React.useEffect(() => {
    if (
      prevSelectedBank &&
      prevSwapBank &&
      prevAmount &&
      (prevSelectedBank.meta.tokenSymbol !== selectedDepositBank?.meta.tokenSymbol ||
        ("info" in prevSwapBank && prevSwapBank.info.state.mint.toBase58() !== selectedSwapBank?.address.toBase58()) ||
        prevAmount !== amount)
    ) {
      setAdditionalActionMessages([]);
      setErrorMessage(null);
    }
  }, [prevSelectedBank, prevSwapBank, prevAmount, selectedDepositBank, selectedSwapBank, amount, setErrorMessage]);

  ///////////////////////
  // Deposit-Swap Actions //
  ///////////////////////
  const executeAction = async (
    params: ExecuteDepositSwapActionProps,
    callbacks: {
      captureEvent?: (event: string, properties?: Record<string, any>) => void;
      setIsLoading: (loading: boolean) => void;
      handleOnComplete: (txnSigs: string[]) => void;
      retryCallback: (txns: DepositSwapActionTxns, multiStepToast: MultiStepToastHandle) => void;
    }
  ) => {
    const action = async (params: ExecuteDepositSwapActionProps) => {
      console.log("params22, ", params);
      handleExecuteDepositSwapAction({
        params,
        captureEvent: (event, properties) => {
          callbacks.captureEvent && callbacks.captureEvent(event, properties);
        },
        setIsLoading: callbacks.setIsLoading,
        setIsComplete: callbacks.handleOnComplete,
        setError: (error: IndividualFlowError) => {
          const toast = error.multiStepToast as MultiStepToastHandle;
          const txs = error.actionTxns as DepositSwapActionTxns;
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

  const retryDepositSwapAction = React.useCallback(
    async (params: ExecuteDepositSwapActionProps, swapBank: ExtendedBankInfo | WalletToken | null) => {
      executeAction(params, {
        captureEvent: captureEvent,
        setIsLoading: setIsTransactionExecuting,
        handleOnComplete: (txnSigs: string[]) => {
          setIsActionComplete(true);
          setPreviousTxn({
            txn: txnSigs[txnSigs.length - 1] ?? "",
            txnType: "DEPOSIT_SWAP",
            depositSwapOptions: {
              depositBank: selectedDepositBank as ActiveBankInfo,
              swapBank: selectedSwapBank as ActiveBankInfo,
              depositAmount: actionTxns?.actionQuote
                ? Number(
                    nativeToUi(actionTxns.actionQuote?.outAmount, selectedDepositBank?.info.rawBank.mintDecimals ?? 9)
                  )
                : debouncedAmount ?? 0,
              swapAmount: actionTxns?.actionQuote ? debouncedAmount ?? 0 : 0,
            },
          });
          onComplete &&
            onComplete({
              txn: txnSigs[txnSigs.length - 1] ?? "",
              txnType: "DEPOSIT_SWAP",
              depositSwapOptions: {
                depositBank: selectedDepositBank as ActiveBankInfo,
                swapBank: selectedSwapBank as ActiveBankInfo,
                depositAmount: actionTxns?.actionQuote
                  ? Number(
                      nativeToUi(actionTxns.actionQuote?.outAmount, selectedDepositBank?.info.rawBank.mintDecimals ?? 9)
                    )
                  : debouncedAmount ?? 0,
                swapAmount: actionTxns?.actionQuote ? debouncedAmount ?? 0 : 0,
              },
            });
        },
        retryCallback: (txns: DepositSwapActionTxns, multiStepToast: MultiStepToastHandle) => {
          retryDepositSwapAction({ ...params, actionTxns: txns, multiStepToast }, swapBank);
        },
      });
    },
    [
      actionTxns.actionQuote,
      captureEvent,
      debouncedAmount,
      onComplete,
      selectedDepositBank,
      selectedSwapBank,
      setIsActionComplete,
      setPreviousTxn,
    ]
  );

  const handleDepositSwapAction = React.useCallback(
    async (_actionTxns?: DepositSwapActionTxns, multiStepToast?: MultiStepToastHandle) => {
      console.log({
        actionTxns,
        marginfiClient,
        debouncedAmount,
        transactionSettings,
      });
      if (!actionTxns || !marginfiClient || !debouncedAmount || debouncedAmount === 0 || !transactionSettings) {
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
          broadcastType: transactionSettings.broadcastType,
        },
        txOpts: {},
        multiStepToast,
        actionType: lendMode,
        swapBank: selectedSwapBank,
      } as ExecuteDepositSwapActionProps;

      console.log(params);

      await executeAction(params, {
        captureEvent: captureEvent,
        setIsLoading: setIsTransactionExecuting,
        handleOnComplete: (txnSigs: string[]) => {
          setIsActionComplete(true);
          setPreviousTxn({
            txn: txnSigs[txnSigs.length - 1] ?? "",
            txnType: "DEPOSIT_SWAP",
            depositSwapOptions: {
              depositBank: selectedDepositBank as ActiveBankInfo,
              swapBank: selectedSwapBank as ActiveBankInfo,
              depositAmount: actionTxns?.actionQuote
                ? Number(
                    nativeToUi(actionTxns.actionQuote?.outAmount, selectedDepositBank?.info.rawBank.mintDecimals ?? 9)
                  )
                : debouncedAmount,
              swapAmount: actionTxns?.actionQuote ? debouncedAmount : 0,
            },
          });
          onComplete &&
            onComplete({
              txn: txnSigs[txnSigs.length - 1] ?? "",
              txnType: "DEPOSIT_SWAP",
              depositSwapOptions: {
                depositBank: selectedDepositBank as ActiveBankInfo,
                swapBank: selectedSwapBank as ActiveBankInfo,
                depositAmount: actionTxns?.actionQuote
                  ? Number(
                      nativeToUi(actionTxns.actionQuote?.outAmount, selectedDepositBank?.info.rawBank.mintDecimals ?? 9)
                    )
                  : debouncedAmount,
                swapAmount: actionTxns?.actionQuote ? debouncedAmount : 0,
              },
            });
        },
        retryCallback: (txns: DepositSwapActionTxns, multiStepToast: MultiStepToastHandle) => {
          retryDepositSwapAction({ ...params, actionTxns: txns, multiStepToast }, selectedSwapBank);
        },
      });
    },
    [
      actionTxns,
      marginfiClient,
      debouncedAmount,
      selectedDepositBank,
      nativeSolBalance,
      selectedAccount,
      priorityFees,
      transactionSettings,
      lendMode,
      selectedSwapBank,
      captureEvent,
      setIsActionComplete,
      setPreviousTxn,
      onComplete,
      retryDepositSwapAction,
    ]
  );

  React.useEffect(() => {
    if (marginfiClient) {
      refreshBanks(banks);
    }
  }, [marginfiClient, banks, refreshBanks]);

  return (
    <ActionBoxContentWrapper>
      <div className="mb-4">
        <span className="text-sm text-muted-foreground">
          {!requestedDepositBank ||
          (selectedDepositBank &&
            selectedSwapBank &&
            selectedDepositBank.meta.tokenSymbol ===
              ("info" in selectedSwapBank ? selectedSwapBank.info.state.mint.toBase58() : selectedSwapBank.symbol))
            ? "Deposit"
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
          setSelectedBank={setSelectedSwapBank}
          walletTokens={walletTokens}
        />
      </div>

      {!requestedDepositBank && (
        <div className="mb-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                  ✨ Collateral <IconInfoCircle className="w-4 h-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>This is the collateral you will be depositing into.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ActionInput
            banks={banks.filter(
              (bank) => "info" in bank && bank.info.rawBank.mint.toBase58() !== selectedSwapBank?.address.toBase58()
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
              if (bank && "info" in bank) {
                setSelectedDepositBank(bank);
              }
            }}
            isInputDisabled={true}
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
