import React from "react";

import {
  ActionMessageType,
  capture,
  ExecuteTradeActionProps,
  formatAmount,
  TradeActionTxns,
  MultiStepToastHandle,
  showErrorToast,
  useConnection,
  STATIC_SIMULATION_ERRORS,
} from "@mrgnlabs/mrgn-utils";
import { IconSettings } from "@tabler/icons-react";

import { ArenaPoolV2 } from "~/types/trade-store.types";
import { initiateTradeAction, SimulationStatus, TradeSide } from "~/components/common/trade-box-v2/utils";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { useTradeStoreV2, useUiStore } from "~/store";
import { useWallet, useWalletStore } from "~/components/wallet-v2";
import { useExtendedPool } from "~/hooks/useExtendedPools";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
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
  ActionSimulationStatus,
} from "./components";
import { useTradeBoxStore } from "./store";
import { checkTradeActionAvailable } from "./utils";
import { useTradeSimulation, useActionAmounts } from "./hooks";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

type TradeBoxV2Props = {
  activePool: ArenaPoolV2;
  side?: TradeSide;
};

export const TradeBoxV2 = ({ activePool, side = "long" }: TradeBoxV2Props) => {
  // Stores
  const [
    amountRaw,
    tradeState,
    leverage,
    simulationResult,
    actionTxns,
    errorMessage,
    depositBankPk,
    borrowBankPk,
    maxLeverage,
    refreshState,
    setAmountRaw,
    setTradeState,
    setLeverage,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setDepositBankPk,
    setBorrowBankPk,
    setMaxLeverage,
  ] = useTradeBoxStore((state) => [
    state.amountRaw,
    state.tradeState,
    state.leverage,
    state.simulationResult,
    state.actionTxns,
    state.errorMessage,
    state.depositBankPk,
    state.borrowBankPk,
    state.maxLeverage,
    state.refreshState,
    state.setAmountRaw,
    state.setTradeState,
    state.setLeverage,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.setDepositBankPk,
    state.setBorrowBankPk,
    state.setMaxLeverage,
  ]);
  const [
    jupiterOptions,
    platformFeeBps,
    broadcastType,
    priorityFees,
    setIsActionComplete,
    setPreviousTxn,
    setDisplaySettings,
  ] = useUiStore((state) => [
    state.jupiterOptions,
    state.platformFeeBps,
    state.broadcastType,
    state.priorityFees,
    state.setIsActionComplete,
    state.setPreviousTxn,
    state.setDisplaySettings,
  ]);
  const [setIsWalletOpen] = useWalletStore((state) => [state.setIsWalletOpen]);
  const [refreshGroup, tokenAccountMap] = useTradeStoreV2((state) => [state.refreshGroup, state.tokenAccountMap]);

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
    tokenAccountMap,
    activePoolExtended,
  });
  const debouncedLeverage = useAmountDebounce<number>(leverage, 500);

  // Memos
  const depositBank = React.useMemo(() => {
    if (!depositBankPk) return null;
    return (
      [activePoolExtended.tokenBank, activePoolExtended.quoteBank].find((bank) =>
        bank?.address.equals(depositBankPk)
      ) ?? null
    );
  }, [depositBankPk, activePoolExtended]);
  const borrowBank = React.useMemo(() => {
    if (!borrowBankPk) return null;
    return (
      [activePoolExtended.tokenBank, activePoolExtended.quoteBank].find((bank) => bank?.address.equals(borrowBankPk)) ??
      null
    );
  }, [borrowBankPk, activePoolExtended]);

  // States
  const [dynamicActionMessages, setDynamicActionMessages] = React.useState<ActionMessageType[]>([]);

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

  const staticActionMethods = React.useMemo(
    () =>
      checkTradeActionAvailable({
        amount,
        connected,
        depositBank: depositBank,
        borrowBank: borrowBank,
        actionQuote: actionTxns.actionQuote,
        tradeState,
        groupStatus: activePoolExtended.status,
        leverage,
      }),

    [amount, connected, actionTxns, tradeState, borrowBank, depositBank, leverage]
  );

  const actionMethods = React.useMemo(() => {
    return staticActionMethods.concat(dynamicActionMessages);
  }, [staticActionMethods, dynamicActionMessages]);

  const isDisabled = React.useMemo(() => {
    if (!actionTxns?.transactions.length || !actionTxns?.actionQuote) return true;
    if (actionMethods.filter((value) => value.isEnabled === false).length) return true;
    return false;
  }, [actionMethods, actionTxns]);

  // Effects
  React.useEffect(() => {
    if (activePoolExtended) {
      if (tradeState === "short") {
        setDepositBankPk(activePoolExtended.quoteBank.address);
        setBorrowBankPk(activePoolExtended.tokenBank.address);
      } else {
        setDepositBankPk(activePoolExtended.tokenBank.address);
        setBorrowBankPk(activePoolExtended.quoteBank.address);
      }
    }
  }, [activePoolExtended, setDepositBankPk, setBorrowBankPk, tradeState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      if (errorMessage.actionMethod === "ERROR") {
        showErrorToast(errorMessage);
      }
      setDynamicActionMessages([errorMessage]);
    } else {
      setDynamicActionMessages([]);
    }
  }, [errorMessage]);

  React.useEffect(() => {
    refreshState();
  }, [refreshState]);

  React.useEffect(() => {
    setTradeState(side);
  }, [setTradeState, side]);

  const { refreshSimulation } = useTradeSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    debouncedLeverage: debouncedLeverage ?? 0,
    depositBank: depositBank,
    borrowBank: borrowBank,
    marginfiClient: client,
    wrappedAccount: wrappedAccount,
    jupiterOptions: jupiterOptions,
    platformFeeBps: platformFeeBps,
    isEnabled: !actionMethods.filter((value) => value.isEnabled === false).length,
    setActionTxns: setActionTxns,
    setErrorMessage: setErrorMessage,
    setIsLoading: setIsSimulating,
    setSimulationResult,
    setMaxLeverage,
    tradeState,
  });

  const handleAmountChange = React.useCallback(
    (amountRaw: string) => {
      const amount = formatAmount(amountRaw, maxAmount, activePoolExtended.quoteBank, numberFormater);
      setAmountRaw(amount);
    },
    [maxAmount, depositBank, numberFormater, setAmountRaw]
  );

  /////////////////////
  // Trading Actions //
  /////////////////////

  const retryTradeAction = React.useCallback(
    (params: ExecuteTradeActionProps, leverage: number) => {
      initiateTradeAction(params, {
        captureEvent: () => {
          capture("trade_action_retry", {
            group: activePoolExtended.groupPk.toBase58(),
            bank: depositBank?.meta.tokenSymbol,
          });
        },
        handleOnComplete: (txnSigs: string[]) => {
          setIsActionComplete(true);
          setPreviousTxn({
            txnType: "TRADING",
            txn: txnSigs[txnSigs.length - 1] ?? "",
            tradingOptions: {
              depositBank: params.depositBank as ActiveBankInfo,
              borrowBank: params.borrowBank as ActiveBankInfo,
              initDepositAmount: params.depositAmount.toString(),
              depositAmount: params.actualDepositAmount,
              borrowAmount: params.borrowAmount.toNumber(),
              leverage: leverage,
              type: params.tradeSide,
              quote: params.actionTxns.actionQuote!,
              entryPrice: activePoolExtended.tokenBank.info.oraclePrice.priceRealtime.price.toNumber(),
            },
          });
          refreshGroup({
            connection,
            wallet,
            groupPk: activePoolExtended.groupPk,
            banks: [activePoolExtended.tokenBank.address, activePoolExtended.quoteBank.address],
          });
        },

        setIsLoading: setIsTransactionExecuting,
        setAmountRaw,
        retryCallback: (txns: TradeActionTxns, multiStepToast: MultiStepToastHandle) => {
          retryTradeAction({ ...params, actionTxns: txns, multiStepToast }, leverage);
        },
      });
    },
    [
      activePoolExtended,
      setIsActionComplete,
      setPreviousTxn,
      setAmountRaw,
      depositBank?.meta.tokenSymbol,
      refreshGroup,
      connection,
      wallet,
    ]
  );

  const handleTradeAction = React.useCallback(async () => {
    // Validate required dependencies for trade action
    if (!client) {
      showErrorToast(STATIC_SIMULATION_ERRORS.NOT_INITIALIZED);
      return;
    }
    if (!depositBank || !borrowBank) {
      showErrorToast(STATIC_SIMULATION_ERRORS.BANK_NOT_INITIALIZED);
      return;
    }
    if (!actionTxns) {
      showErrorToast(STATIC_SIMULATION_ERRORS.SIMULATION_NOT_READY);
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
      depositBank: depositBank,
      borrowBank: borrowBank,
      quote: actionTxns.actionQuote!,
      connection: client.provider.connection,
      tradeSide: tradeState,
    };

    initiateTradeAction(params, {
      captureEvent: () => {
        capture("trade_action_execute", {
          group: activePoolExtended.groupPk.toBase58(),
          bank: depositBank?.meta.tokenSymbol,
        });
      },
      handleOnComplete: (txnSigs: string[]) => {
        console.log("handleOnComplete in trade-box.tsx");
        setIsActionComplete(true);
        setPreviousTxn({
          txnType: "TRADING",
          txn: txnSigs[txnSigs.length - 1] ?? "",
          tradingOptions: {
            depositBank: params.depositBank as ActiveBankInfo,
            borrowBank: params.borrowBank as ActiveBankInfo,
            initDepositAmount: params.depositAmount.toString(),
            depositAmount: params.actualDepositAmount,
            borrowAmount: params.borrowAmount.toNumber(),
            leverage: leverage,
            type: params.tradeSide,
            quote: params.actionTxns.actionQuote!,
            entryPrice: activePoolExtended.tokenBank.info.oraclePrice.priceRealtime.price.toNumber(),
          },
        });
        refreshGroup({
          connection,
          wallet,
          groupPk: activePoolExtended.groupPk,
          banks: [activePoolExtended.tokenBank.address, activePoolExtended.quoteBank.address],
        });
      },
      setIsLoading: setIsTransactionExecuting,
      setAmountRaw,
      retryCallback: (txns: TradeActionTxns, multiStepToast: MultiStepToastHandle) => {
        retryTradeAction({ ...params, actionTxns: txns, multiStepToast }, leverage);
      },
    });
  }, [
    client,
    depositBank,
    borrowBank,
    actionTxns,
    priorityFees,
    broadcastType,
    wrappedAccount,
    amount,
    tradeState,
    leverage,
    setIsActionComplete,
    setPreviousTxn,
    setAmountRaw,
    refreshGroup,
    connection,
    wallet,
    retryTradeAction,
    activePoolExtended,
  ]);

  return (
    <Card className="shadow-none border-border w-full">
      <CardHeader className="p-0">
        <Header
          activePool={activePoolExtended}
          entryPrice={
            activePoolExtended.tokenBank.tokenData?.price ?? activePoolExtended.tokenBank.info.state.price ?? 0
          }
          volume={activePoolExtended.tokenBank.tokenData?.volume24hr}
        />
      </CardHeader>
      <CardContent className="px-4 py-2">
        <div className="space-y-4">
          <ActionToggle tradeState={tradeState} setTradeState={setTradeState} />
          <AmountInput
            maxAmount={maxAmount}
            amount={amountRaw}
            handleAmountChange={handleAmountChange}
            quoteBank={activePoolExtended.quoteBank}
          />
          <LeverageSlider
            depositBank={depositBank}
            borrowBank={borrowBank}
            amountRaw={amountRaw}
            leverageAmount={leverage}
            maxLeverage={maxLeverage}
            setLeverageAmount={setLeverage}
          />
          {leveragedAmount > 0 && (
            <AmountPreview
              tradeSide={tradeState}
              amount={leveragedAmount}
              isLoading={isLoading && isSimulating.isLoading}
              depositBank={activePoolExtended.tokenBank}
            />
          )}
          {actionMethods && actionMethods.some((method) => method.description) && (
            <InfoMessages
              connected={connected}
              actionMethods={actionMethods}
              setIsWalletOpen={setIsWalletOpen}
              refreshStore={() =>
                refreshGroup({
                  connection,
                  wallet,
                  groupPk: activePoolExtended.groupPk,
                  banks: [activePoolExtended.tokenBank.address, activePoolExtended.quoteBank.address],
                })
              }
              refreshSimulation={refreshSimulation}
              isRetrying={isSimulating.isLoading}
              quoteBalance={maxAmount}
              quoteBank={activePoolExtended.quoteBank}
            />
          )}

          <ActionButton
            isLoading={isLoading}
            isEnabled={!isDisabled}
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
              hasErrorMessages={dynamicActionMessages.length > 0}
              isActive={depositBank && amount > 0 ? true : false}
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
          <Stats
            activePool={activePoolExtended}
            accountSummary={accountSummary}
            simulationResult={simulationResult}
            actionTxns={actionTxns}
          />
        </div>
      </CardContent>
    </Card>
  );
};
