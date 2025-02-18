import React, { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  ActionMessageType,
  capture,
  formatAmount,
  useConnection,
  ExecuteTradeActionProps,
  ExecuteTradeAction,
} from "@mrgnlabs/mrgn-utils";
import { IconSettings } from "@tabler/icons-react";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { ArenaPoolV2 } from "~/types/trade-store.types";
import {  SimulationStatus, TradeSide } from "~/components/common/trade-box-v2/utils";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { useTradeStoreV2, useUiStore } from "~/store";
import { useWallet, useWalletStore } from "~/components/wallet-v2";
import { useExtendedPool } from "~/hooks/useExtendedPools";
import { useArenaClient } from "~/hooks/useArenaClient";
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
  InfoMessages,
  ActionSimulationStatus,
} from "./components";
import { useTradeBoxStore } from "./store";
import { checkTradeActionAvailable } from "./utils";
import { useTradeSimulation, useActionAmounts } from "./hooks";
import { toastManager } from "@mrgnlabs/mrgn-toasts";
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
    setDisplaySettings,
  ] = useUiStore((state) => [
    state.jupiterOptions,
    state.platformFeeBps,
    state.broadcastType,
    state.priorityFees,
    state.setDisplaySettings,
  ]);
  const [setIsWalletOpen] = useWalletStore((state) => [state.setIsWalletOpen]);
  const [refreshGroup, tokenAccountMap] = useTradeStoreV2((state) => [state.refreshGroup, state.tokenAccountMap]);

  // Hooks
  const activePoolExtended = useExtendedPool(activePool);
  const client = useArenaClient({ groupPk: activePoolExtended.groupPk });
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

    [
      amount,
      connected,
      depositBank,
      borrowBank,
      actionTxns.actionQuote,
      tradeState,
      activePoolExtended.status,
      leverage,
    ]
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
        toastManager.showErrorToast(errorMessage);
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
    [maxAmount, activePoolExtended, numberFormater, setAmountRaw]
  );

  /////////////////////
  // Trading Actions //
  /////////////////////
  const handleTradeAction = useCallback(() => {
    if (!depositBank || !actionTxns || !borrowBank || !client) return 


    const props : ExecuteTradeActionProps = {
      actionTxns,
      attemptUuid: uuidv4(),
      marginfiClient: client,
      processOpts: { ...priorityFees, broadcastType },
      txOpts: {},
      callbacks: {
        captureEvent: capture,
        onComplete: () => {
          refreshGroup({
            connection,
            wallet,
            groupPk: activePoolExtended.groupPk,
            banks: [activePoolExtended.tokenBank.address, activePoolExtended.quoteBank.address],
          })
        },
      },
      infoProps: {
        depositAmount: dynamicNumeralFormatter(Number(amountRaw)),
        depositToken: depositBank.meta.tokenSymbol,
        borrowAmount: dynamicNumeralFormatter(actionTxns.borrowAmount.toNumber()),
        borrowToken: borrowBank.meta.tokenSymbol,
        tradeSide: tradeState,
      }
    } 

    ExecuteTradeAction(props);

    setAmountRaw("");
  }, [depositBank, actionTxns, borrowBank, client, priorityFees, broadcastType, amountRaw, tradeState, setAmountRaw, refreshGroup, connection, wallet, activePoolExtended])

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
