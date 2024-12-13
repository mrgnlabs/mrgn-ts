"use client";

import React from "react";

import {
  ActionMessageType,
  ActionTxns,
  capture,
  ExecuteTradeActionProps,
  formatAmount,
  IndividualFlowError,
  LoopActionTxns,
  MultiStepToastHandle,
  showErrorToast,
  useConnection,
} from "@mrgnlabs/mrgn-utils";
import { IconSettings } from "@tabler/icons-react";
import { ActionType, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { ArenaPoolV2 } from "~/store/tradeStoreV2";
import { handleExecuteTradeAction, SimulationStatus, TradeSide } from "~/components/common/trade-box-v2/utils";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { useTradeStoreV2, useUiStore } from "~/store";
import { useWallet, useWalletStore } from "~/components/wallet-v2";
import { useExtendedPool } from "~/hooks/useExtendedPools";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { PreviousTxn } from "~/types";

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
  ActionSimulationStatus,
} from "./components";
import { useTradeBoxStore } from "./store";
import { checkTradeActionAvailable } from "./utils";
import { useTradeSimulation, useActionAmounts } from "./hooks";

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
  const [
    slippageBps,
    setSlippageBps,
    platformFeeBps,
    broadcastType,
    priorityFees,
    setIsActionComplete,
    setPreviousTxn,
  ] = useUiStore((state) => [
    state.slippageBps,
    state.setSlippageBps,
    state.platformFeeBps,
    state.broadcastType,
    state.priorityFees,
    state.setIsActionComplete,
    state.setPreviousTxn,
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
  const { wallet, connected } = useWallet();
  const { connection } = useConnection();
  const { amount, debouncedAmount, maxAmount } = useActionAmounts({
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
  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const leveragedAmount = React.useMemo(() => {
    if (tradeState === "long") {
      return actionTxns?.actualDepositAmount;
    } else {
      return actionTxns?.borrowAmount.toNumber();
    }
  }, [tradeState, actionTxns]);

  const actionMethods = React.useMemo(
    () =>
      checkTradeActionAvailable({
        amount,
        connected,
        collateralBank: selectedBank,
        secondaryBank: selectedSecondaryBank,
        actionQuote: actionTxns.actionQuote,
        tradeState,
      }),

    [amount, connected, activePoolExtended, actionTxns, tradeState, selectedSecondaryBank, selectedBank]
  );

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

  React.useEffect(() => {
    refreshState();
  }, []);

  React.useEffect(() => {
    setTradeState(side);
  }, [side]);

  const { refreshSimulation } = useTradeSimulation({
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
    isEnabled: !actionMethods.concat(additionalActionMessages).filter((value) => value.isEnabled === false).length,
    setActionTxns: setActionTxns,
    setErrorMessage: setErrorMessage,
    setIsLoading: setIsSimulating,
    setSimulationResult,
    setMaxLeverage,
  });

  React.useEffect(() => {
    console.log("actionMethods", actionMethods);
    console.log("additionalActionMessages", additionalActionMessages);
    console.log(!actionMethods.concat(additionalActionMessages).filter((value) => value.isEnabled === false).length);
  }, [actionMethods]);

  const isActiveWithCollat = true; // TODO: figure out what this does?

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
    params: ExecuteTradeActionProps,
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
    const action = async (params: ExecuteTradeActionProps) => {
      await handleExecuteTradeAction({
        props: params,
        captureEvent: (event, properties) => {
          callbacks.captureEvent && callbacks.captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          const _actionTxns = params.actionTxns as LoopActionTxns;
          callbacks.setIsActionComplete(true);
          callbacks.setPreviousTxn({
            txnType: "TRADING",
            txn: txnSigs[txnSigs.length - 1] ?? "",
            tradingOptions: {
              depositBank: params.depositBank as ActiveBankInfo,
              borrowBank: params.borrowBank as ActiveBankInfo,
              initDepositAmount: params.depositAmount.toString(),
              depositAmount: params.actualDepositAmount,
              borrowAmount: params.borrowAmount.toNumber(),
              leverage: leverage,
              type: tradeState,
              quote: _actionTxns.actionQuote!,
              entryPrice: activePoolExtended.tokenBank.info.oraclePrice.priceRealtime.price.toNumber(),
            },
          });

          callbacks.onComplete &&
            callbacks.onComplete({
              txn: txnSigs[txnSigs.length - 1] ?? "",
              txnType: "TRADING",
              tradingOptions: {
                depositBank: params.depositBank as ActiveBankInfo,
                borrowBank: params.borrowBank as ActiveBankInfo,
                initDepositAmount: params.depositAmount.toString(),
                depositAmount: params.actualDepositAmount,
                borrowAmount: params.borrowAmount.toNumber(),
                leverage: leverage,
                type: tradeState,
                quote: _actionTxns.actionQuote!,
                entryPrice: activePoolExtended.tokenBank.info.oraclePrice.priceRealtime.price.toNumber(),
              },
            });
        },
        setError: (error: IndividualFlowError) => {
          const toast = error.multiStepToast as MultiStepToastHandle;
          if (!toast) {
            return;
          }
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
    (params: ExecuteTradeActionProps, leverage: number) => {
      executeAction(params, leverage, {
        captureEvent: () => {
          capture("trade_action_retry", {
            group: activePoolExtended.groupPk.toBase58(),
            bank: selectedBank?.meta.tokenSymbol,
          });
        },
        setIsActionComplete: setIsActionComplete,
        setPreviousTxn,
        onComplete: () => {
          refreshGroup({
            connection,
            wallet,
            groupPk: activePoolExtended.groupPk,
            banks: [activePoolExtended.tokenBank.address, activePoolExtended.quoteBank.address],
          });
        },
        setIsLoading: setIsTransactionExecuting,
        setAmountRaw,
        retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
          retryTradeAction({ ...params, actionTxns: txns, multiStepToast }, leverage);
        },
      });
    },
    [setAmountRaw, setIsTransactionExecuting, setIsActionComplete, setPreviousTxn]
  );

  const handleTradeAction = React.useCallback(async () => {
    if (!client || !selectedBank || !selectedSecondaryBank || !actionTxns) {
      return;
    }

    const params: ExecuteTradeActionProps = {
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
      tradeSide: tradeState,
    };

    executeAction(params, leverage, {
      captureEvent: () => {
        capture("trade_action_execute", {
          group: activePoolExtended.groupPk.toBase58(),
          bank: selectedBank?.meta.tokenSymbol,
        });
      },
      setIsActionComplete: setIsActionComplete,
      setPreviousTxn,
      onComplete: () => {
        refreshGroup({
          connection,
          wallet,
          groupPk: activePoolExtended.groupPk,
          banks: [activePoolExtended.tokenBank.address, activePoolExtended.quoteBank.address],
        });
      },
      setIsLoading: setIsTransactionExecuting,
      setAmountRaw,
      retryCallback: (txns: ActionTxns, multiStepToast: MultiStepToastHandle) => {
        retryTradeAction({ ...params, actionTxns: txns, multiStepToast }, leverage);
      },
    });
  }, [
    client,
    selectedBank,
    selectedSecondaryBank,
    actionTxns,
    priorityFees,
    broadcastType,
    wrappedAccount,
    amount,
    leverage,
    setIsActionComplete,
    setIsTransactionExecuting,
    setAmountRaw,
  ]);

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
          {leveragedAmount > 0 && (
            <AmountPreview
              tradeSide={tradeState}
              amount={leveragedAmount}
              isLoading={isLoading}
              selectedBank={activePoolExtended.tokenBank}
            />
          )}
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
          <div className="flex items-center w-full justify-between">
            <ActionSimulationStatus
              simulationStatus={isSimulating.status}
              hasErrorMessages={additionalActionMessages.length > 0}
              isActive={selectedBank && amount > 0 ? true : false}
            />
            <TradingBoxSettingsDialog
              setSlippageBps={(value) => setSlippageBps(value * 100)}
              slippageBps={slippageBps / 100}
            >
              <button className="text-xs gap-1 h-6 px-2 flex items-center rounded-full border bg-transparent hover:bg-accent text-muted-foreground">
                Settings <IconSettings size={16} />
              </button>
            </TradingBoxSettingsDialog>
          </div>
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
