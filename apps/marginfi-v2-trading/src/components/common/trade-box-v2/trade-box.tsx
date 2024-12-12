"use client";

import React from "react";

import {
  ActionMessageType,
  ActionTxns,
  ExecuteLoopingActionProps,
  formatAmount,
  IndividualFlowError,
  MultiStepToastHandle,
  PreviousTxn,
  showErrorToast,
  useConnection,
  usePrevious,
} from "@mrgnlabs/mrgn-utils";
import { IconSettings } from "@tabler/icons-react";

import { ArenaPoolV2 } from "~/store/tradeStoreV2";
import { handleExecuteTradeAction, TradeSide } from "~/components/common/trade-box-v2/utils";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { useTradeStoreV2, useUiStore } from "~/store";
import { useWallet, useWalletStore } from "~/components/wallet-v2";
import { useExtendedPool } from "~/hooks/useExtendedPools";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { SimulationStatus } from "~/components/action-box-v2/utils";
import { useAmountDebounce } from "~/hooks/useAmountDebounce";

import {
  ActionButton,
  ActionToggle,
  AmountInput,
  AmountPreview,
  Header,
  LeverageSlider,
  Stats,
  TradingBoxSettingsDialog,
  InfoMessages,
} from "./components";
import { useTradeBoxStore } from "./store";
import { checkTradeActionAvailable } from "./utils";
import { useTradeSimulation, useActionAmounts } from "./hooks";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { useActionContext } from "@mrgnlabs/mrgn-ui";
import { UnderlineIcon } from "@radix-ui/react-icons";

interface TradeBoxV2Props {
  activePool: ArenaPoolV2;
  side?: TradeSide;
}

export const TradeBoxV2 = ({ activePool, side = "long" }: TradeBoxV2Props) => {
  // Stores
  const [
    amountRaw,
    tradeState,
    leverage,
    simulationResult,
    actionTxns,
    errorMessage,
    selectedBank,
    selectedSecondaryBank,
    maxLeverage,
    refreshState,
    setAmountRaw,
    setTradeState,
    setLeverage,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setSelectedBank,
    setSelectedSecondaryBank,
    setMaxLeverage,
  ] = useTradeBoxStore((state) => [
    state.amountRaw,
    state.tradeState,
    state.leverage,
    state.simulationResult,
    state.actionTxns,
    state.errorMessage,
    state.selectedBank,
    state.selectedSecondaryBank,
    state.maxLeverage,
    state.refreshState,
    state.setAmountRaw,
    state.setTradeState,
    state.setLeverage,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.setSelectedBank,
    state.setSelectedSecondaryBank,
    state.setMaxLeverage,
  ]);
  const [slippageBps, setSlippageBps, platformFeeBps, broadcastType, priorityFees] = useUiStore((state) => [
    state.slippageBps,
    state.setSlippageBps,
    state.platformFeeBps,
    state.broadcastType,
    state.priorityFees,
  ]);
  const [setIsWalletOpen] = useWalletStore((state) => [state.setIsWalletOpen]);
  const [fetchTradeState, nativeSolBalance, setIsRefreshingStore, refreshGroup] = useTradeStoreV2((state) => [
    state.fetchTradeState,
    state.nativeSolBalance,
    state.setIsRefreshingStore,
    state.refreshGroup,
  ]);

  // Hooks
  const activePoolExtended = useExtendedPool(activePool);
  const client = useMarginfiClient({ groupPk: activePoolExtended.groupPk });
  const { accountSummary, wrappedAccount } = useWrappedAccount({
    client,
    groupPk: activePoolExtended.groupPk,
    banks: [activePoolExtended.tokenBank, activePoolExtended.quoteBank],
  });
  const { walletContextState, wallet, connected } = useWallet();
  const { connection } = useConnection();
  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    activePool: activePoolExtended,
    collateralBank: selectedBank,
    nativeSolBalance,
  });
  const debouncedLeverage = useAmountDebounce<number>(leverage, 500);

  // States
  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

  // Loading states
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

  // Memos
  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []); // The fuck is this lol?

  const leveragedAmount = React.useMemo(() => {
    if (tradeState === "long") {
      return actionTxns?.actualDepositAmount;
    } else {
      return actionTxns?.borrowAmount.toNumber();
    }
  }, [tradeState, actionTxns]);

  // Effects
  React.useEffect(() => {
    if (activePoolExtended) {
      if (tradeState === "short") {
        setSelectedBank(activePoolExtended.quoteBank);
        setSelectedSecondaryBank(activePoolExtended.tokenBank);
      } else {
        setSelectedBank(activePoolExtended.tokenBank);
        setSelectedSecondaryBank(activePoolExtended.quoteBank);
      }
    }
  }, [activePoolExtended, tradeState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      showErrorToast(errorMessage?.description);
      setAdditionalActionMessages([errorMessage]);
    } else {
      setAdditionalActionMessages([]);
    }
  }, [errorMessage]);

  // TODO: on load, reset everything
  React.useEffect(() => {
    refreshState();
  }, []);

  const { actionSummary, refreshSimulation } = useTradeSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    debouncedLeverage: debouncedLeverage ?? 0,
    selectedBank: selectedBank,
    selectedSecondaryBank: selectedSecondaryBank,
    marginfiClient: client,
    wrappedAccount: wrappedAccount,
    slippageBps: slippageBps,
    platformFeeBps: platformFeeBps,
    actionTxns: actionTxns,
    simulationResult: null,
    accountSummary: accountSummary ?? undefined,
    setActionTxns: setActionTxns,
    setErrorMessage: setErrorMessage,
    setIsLoading: setIsSimulating,
    setSimulationResult,
    setMaxLeverage,
  });

  React.useEffect(() => {
    console.log({
      selectedBank: selectedBank?.meta.tokenSymbol,
      selectedSecondaryBank: selectedSecondaryBank?.meta.tokenSymbol,
    });

    let borrowBank, depositBank;

    if (tradeState === "long") {
      depositBank = activePoolExtended.tokenBank;
      borrowBank = activePoolExtended.quoteBank;
    } else {
      depositBank = activePoolExtended.quoteBank;
      borrowBank = activePoolExtended.tokenBank;
    }

    console.log({
      depositBank: depositBank?.meta.tokenSymbol,
      borrowBank: borrowBank?.meta.tokenSymbol,
    });
  }, [selectedBank, selectedSecondaryBank]);

  const isActiveWithCollat = true; // TODO: figure out what this does?

  const actionMethods = React.useMemo(
    () =>
      checkTradeActionAvailable({
        amount,
        connected,
        collateralBank: selectedBank,
        secondaryBank: selectedSecondaryBank,
        actionQuote: actionTxns.actionQuote,
      }),

    [amount, connected, activePoolExtended, actionTxns, tradeState]
  );

  const handleAmountChange = React.useCallback(
    (amountRaw: string) => {
      const amount = formatAmount(amountRaw, maxAmount, selectedBank ?? null, numberFormater);
      setAmountRaw(amount);
    },
    [maxAmount, selectedBank, numberFormater]
  );

  /////////////////////
  // Trading Actions //
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
      await handleExecuteTradeAction({
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
          // TODO: update the messaging within the toast. Might need tailored functions in the sdk for trading
          console.log("error", error);
          const toast = error.multiStepToast as MultiStepToastHandle; // TODO: check if this works, not sure it does
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

  const retryTradeAction = React.useCallback(
    (params: ExecuteLoopingActionProps, leverage: number) => {
      executeAction(params, leverage, {
        captureEvent: () => {}, // TODO: implement this
        setIsActionComplete: () => {}, // TODO: implement this
        setPreviousTxn: () => {}, // TODO: implement this
        onComplete: () => {}, // TODO: implement this
        setIsLoading: setIsTransactionExecuting,
        setAmountRaw,
        retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
          retryTradeAction({ ...params, actionTxns: txns, multiStepToast }, leverage);
        },
      });
    },
    [setAmountRaw, setIsTransactionExecuting]
  );

  const handleTradeAction = React.useCallback(async () => {
    if (!client || !selectedBank || !selectedSecondaryBank || !actionTxns) {
      return;
    }

    const params: ExecuteLoopingActionProps = {
      marginfiClient: client,
      actionTxns,
      processOpts: {
        ...priorityFees,
        broadcastType,
      },
      txOpts: {},

      marginfiAccount: wrappedAccount,
      depositAmount: amount,
      borrowAmount: actionTxns.borrowAmount,
      actualDepositAmount: actionTxns.actualDepositAmount,
      depositBank: selectedBank,
      borrowBank: selectedSecondaryBank,
      quote: actionTxns.actionQuote!,
      connection: client.provider.connection,
    };

    executeAction(params, leverage, {
      captureEvent: () => {}, // TODO: implement this
      setIsActionComplete: () => {}, // TODO: implement this
      setPreviousTxn: () => {}, // TODO: implement this
      onComplete: () => {}, // TODO: implement this
      setIsLoading: setIsTransactionExecuting,
      setAmountRaw,
      retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
        retryTradeAction({ ...params, actionTxns: txns, multiStepToast }, leverage);
      },
    });
  }, []);

  return (
    <Card className="shadow-none border-border w-full">
      <CardHeader className="p-0">
        <Header activePool={activePoolExtended} />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ActionToggle tradeState={tradeState} setTradeState={setTradeState} />
          <AmountInput
            maxAmount={maxAmount}
            amount={amountRaw}
            handleAmountChange={handleAmountChange}
            collateralBank={selectedBank}
          />
          <LeverageSlider
            selectedBank={selectedBank}
            selectedSecondaryBank={selectedSecondaryBank}
            amountRaw={amountRaw}
            leverageAmount={leverage}
            maxLeverage={maxLeverage}
            setLeverageAmount={setLeverage}
          />
          <AmountPreview
            tradeSide={tradeState}
            amount={leveragedAmount}
            isLoading={isLoading}
            selectedBank={activePoolExtended.tokenBank}
          />
          {actionMethods && actionMethods.concat(additionalActionMessages).some((method) => method.description) && (
            <InfoMessages
              connected={connected}
              tradeState={tradeState}
              activePool={activePoolExtended}
              isActiveWithCollat={isActiveWithCollat}
              actionMethods={actionMethods}
              additionalChecks={additionalActionMessages}
              setIsWalletOpen={setIsWalletOpen}
              fetchTradeState={fetchTradeState}
              connection={connection}
              wallet={wallet}
              refreshSimulation={refreshSimulation}
              isRetrying={isSimulating.isLoading}
            />
          )}

          <ActionButton
            isLoading={isLoading}
            isEnabled={
              !actionMethods.concat(additionalActionMessages).filter((value) => value.isEnabled === false).length
            }
            connected={connected}
            handleAction={() => {
              handleTradeAction();
            }}
            buttonLabel={tradeState === "long" ? "Long" : "Short"}
            tradeState={tradeState}
          />
          <TradingBoxSettingsDialog
            setSlippageBps={(value) => setSlippageBps(value * 100)}
            slippageBps={slippageBps / 100}
          >
            <div className="flex justify-end">
              <button className="text-xs gap-1 h-6 px-2 flex items-center rounded-full border bg-transparent hover:bg-accent text-muted-foreground">
                Settings <IconSettings size={16} />
              </button>
            </div>
          </TradingBoxSettingsDialog>
        </div>
        <Stats
          activePool={activePoolExtended}
          accountSummary={accountSummary}
          simulationResult={simulationResult}
          actionTxns={actionTxns}
        />
      </CardContent>
    </Card>
  );
};

/*
TODO: 
- when wallet is connected but store is loading, show to user

*/
