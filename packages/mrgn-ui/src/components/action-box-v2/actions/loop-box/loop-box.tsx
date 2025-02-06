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
  IndividualFlowError,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { WalletContextStateOverride } from "~/components/wallet-v2";
import { CircularProgress } from "~/components/ui/circular-progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ActionBoxContentWrapper, ActionButton, ActionSettingsButton } from "~/components/action-box-v2/components";
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
import { useActionContext } from "../../contexts";
import BigNumber from "bignumber.js";
import { IconSettings } from "@tabler/icons-react";

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
  allBanks?: ExtendedBankInfo[];

  isDialog?: boolean;

  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
  setDisplaySettings?: (displaySettings: boolean) => void;
};

export const LoopBox = ({
  nativeSolBalance,
  connected,
  banks,
  marginfiClient,
  selectedAccount,
  accountSummaryArg,
  requestedBank,
  allBanks,
  isDialog,
  onComplete,
  captureEvent,
  setDisplaySettings,
}: LoopBoxProps) => {
  const [
    leverage,
    maxLeverage,
    amountRaw,
    selectedBank,
    selectedSecondaryBank,
    errorMessage,
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
    refreshSelectedBanks,
  ] = useLoopBoxStore((state) => [
    state.leverage,
    state.maxLeverage,
    state.amountRaw,
    state.selectedBank,
    state.selectedSecondaryBank,
    state.errorMessage,
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
    state.refreshSelectedBanks,
  ]);

  const { transactionSettings, priorityFees, jupiterOptions } = useActionContext() || {
    transactionSettings: null,
    priorityFees: null,
    jupiterOptions: null,
  };

  const [setIsSettingsDialogOpen, setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.setIsSettingsDialogOpen,
    state.setPreviousTxn,
    state.setIsActionComplete,
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

  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);
  const [quoteActionMessage, setQuoteActionMessage] = React.useState<ActionMessageType[]>([]);

  const actionMessages = React.useMemo(() => {
    return checkLoopActionAvailable({
      amount,
      connected,
      selectedBank,
      selectedSecondaryBank,
      banks: allBanks ?? [],
    });
  }, [amount, connected, selectedBank, selectedSecondaryBank, allBanks]);

  const { actionSummary, refreshSimulation } = useLoopSimulation({
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
    jupiterOptions,
    setMaxLeverage,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading: setIsSimulating,
    actionMessages: actionMessages,
  });

  const [showSimSuccess, setShowSimSuccess] = React.useState(false);

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (debouncedAmount === 0 && simulationResult) {
      setActionTxns({
        transactions: [],
        actionQuote: null,
        actualDepositAmount: 0,
        borrowAmount: new BigNumber(0),
      });
      setSimulationResult(null);
    }
  }, [simulationResult, debouncedAmount, setActionTxns, setSimulationResult]);

  React.useEffect(() => {
    if (!connected) {
      refreshState();
    }
  }, [refreshState, connected]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedBank });
  }, [requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage?.description) {
      showErrorToast(errorMessage.description);
      setAdditionalActionMessages((prevMessages) => [...prevMessages, errorMessage]);
    } else {
      setAdditionalActionMessages([]);
    }
  }, [errorMessage]);

  React.useEffect(() => {
    if (!actionTxns.actionQuote) {
      setQuoteActionMessage([{ isEnabled: false }]);
    } else {
      setQuoteActionMessage([]);
    }
  }, [actionTxns.actionQuote]);
  /*
  Cleaing additional action messages when the bank or amount changes. This is to prevent outdated errors from being displayed.
  */
  const prevSelectedBank = usePrevious(selectedBank);
  const prevSecondaryBank = usePrevious(selectedSecondaryBank);
  const prevAmount = usePrevious(amount);

  React.useEffect(() => {
    if (
      prevSelectedBank &&
      prevSecondaryBank &&
      prevAmount &&
      (prevSelectedBank.meta.tokenSymbol !== selectedBank?.meta.tokenSymbol ||
        prevSecondaryBank.meta.tokenSymbol !== selectedSecondaryBank?.meta.tokenSymbol ||
        prevAmount !== amount)
    ) {
      setAdditionalActionMessages([]);
      setErrorMessage(null);
    }
  }, [prevSelectedBank, prevSecondaryBank, prevAmount, selectedBank, selectedSecondaryBank, amount, setErrorMessage]);

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
            txn: txnSigs[txnSigs.length - 1] ?? "",
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
              txn: txnSigs[txnSigs.length - 1] ?? "",
              txnType: "LEND",
              lendingOptions: {
                amount: params.depositAmount,
                type: ActionType.Loop,
                bank: params.depositBank as ActiveBankInfo,
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
        setIsLoading: setIsTransactionExecuting,
        setAmountRaw,
        retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
          retryLoopAction({ ...params, actionTxns: txns, multiStepToast }, leverage);
        },
      });
    },
    [captureEvent, onComplete, setAmountRaw, setIsActionComplete, setIsTransactionExecuting, setPreviousTxn]
  );

  const handleLoopAction = React.useCallback(async () => {
    if (!selectedBank || !amount || !marginfiClient || !selectedSecondaryBank || !transactionSettings) {
      return;
    }

    const params: ExecuteLoopingActionProps = {
      marginfiClient,
      actionTxns,
      processOpts: {
        ...priorityFees,
        broadcastType: transactionSettings.broadcastType,
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
      setIsLoading: setIsTransactionExecuting,
      setAmountRaw,
      retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
        retryLoopAction({ ...params, actionTxns: txns, multiStepToast }, leverage);
      },
    });
  }, [
    actionTxns,
    amount,
    transactionSettings,
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
    setIsTransactionExecuting,
    setPreviousTxn,
  ]);

  React.useEffect(() => {
    if (marginfiClient) {
      refreshSelectedBanks(banks);
    }
  }, [marginfiClient, banks, refreshSelectedBanks]);

  return (
    <ActionBoxContentWrapper>
      {actionTxns.lastValidBlockHeight && blockProgress !== 0 && (
        <div className="absolute -top-7 right-4 z-50">
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
      {additionalActionMessages
        .concat(actionMessages)
        .concat(quoteActionMessage)
        .map(
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

      <div className="mb-3 space-y-2">
        <ActionButton
          isLoading={isLoading}
          isEnabled={
            !additionalActionMessages
              .concat(actionMessages)
              .concat(quoteActionMessage)
              .filter((value) => value.isEnabled === false).length
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
          simulationStatus={isSimulating.status}
          hasErrorMessages={additionalActionMessages.length > 0}
          isActive={selectedBank && amount > 0 ? true : false}
          actionType={ActionType.Loop}
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

      <Preview actionSummary={actionSummary} selectedBank={selectedBank} isLoading={isLoading} />
    </ActionBoxContentWrapper>
  );
};
