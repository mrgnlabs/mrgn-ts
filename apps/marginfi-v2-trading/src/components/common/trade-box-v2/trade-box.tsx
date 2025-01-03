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
import {
  initiateTradeAction,
  RANDOM_USDC_BANK,
  SimulationStatus,
  TradeSide,
} from "~/components/common/trade-box-v2/utils";
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
    selectedBankPk,
    selectedSecondaryBankPk,
    maxLeverage,
    refreshState,
    setAmountRaw,
    setTradeState,
    setLeverage,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setSelectedBankPk,
    setSelectedSecondaryBankPk,
    setMaxLeverage,
  ] = useTradeBoxStore((state) => [
    state.amountRaw,
    state.tradeState,
    state.leverage,
    state.simulationResult,
    state.actionTxns,
    state.errorMessage,
    state.selectedBankPk,
    state.selectedSecondaryBankPk,
    state.maxLeverage,
    state.refreshState,
    state.setAmountRaw,
    state.setTradeState,
    state.setLeverage,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.setSelectedBankPk,
    state.setSelectedSecondaryBankPk,
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
  });
  const debouncedLeverage = useAmountDebounce<number>(leverage, 500);

  // Memos
  const selectedBank = React.useMemo(() => {
    if (!selectedBankPk) return null;
    return (
      [activePoolExtended.tokenBank, activePoolExtended.quoteBank].find((bank) =>
        bank?.address.equals(selectedBankPk)
      ) ?? null
    );
  }, [selectedBankPk, activePoolExtended]);
  const selectedSecondaryBank = React.useMemo(() => {
    if (!selectedSecondaryBankPk) return null;
    return (
      [activePoolExtended.tokenBank, activePoolExtended.quoteBank].find((bank) =>
        bank?.address.equals(selectedSecondaryBankPk)
      ) ?? null
    );
  }, [selectedSecondaryBankPk, activePoolExtended]);

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
        collateralBank: selectedBank,
        secondaryBank: selectedSecondaryBank,
        actionQuote: actionTxns.actionQuote,
        tradeState,
        leverage,
      }),

    [amount, connected, actionTxns, tradeState, selectedSecondaryBank, selectedBank, leverage]
  );

  const actionMethods = React.useMemo(() => {
    return staticActionMethods.concat(dynamicActionMessages);
  }, [staticActionMethods, dynamicActionMessages]);

  const isDisabled = React.useMemo(() => {
    if (!actionTxns?.actionQuote || !actionTxns?.actionTxn) return true;
    if (actionMethods.filter((value) => value.isEnabled === false).length) return true;
    return false;
  }, [actionMethods, actionTxns]);

  // Effects
  React.useEffect(() => {
    if (activePoolExtended) {
      if (tradeState === "short") {
        setSelectedBankPk(activePoolExtended.quoteBank.address);
        setSelectedSecondaryBankPk(activePoolExtended.tokenBank.address);
      } else {
        setSelectedBankPk(activePoolExtended.tokenBank.address);
        setSelectedSecondaryBankPk(activePoolExtended.quoteBank.address);
      }
    }
  }, [activePoolExtended, setSelectedBankPk, setSelectedSecondaryBankPk, tradeState]);

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
    selectedBank: selectedBank,
    selectedSecondaryBank: selectedSecondaryBank,
    marginfiClient: client,
    wrappedAccount: wrappedAccount,
    slippageBps: slippageBps,
    platformFeeBps: platformFeeBps,
    isEnabled: !actionMethods.filter((value) => value.isEnabled === false).length,
    setActionTxns: setActionTxns,
    setErrorMessage: setErrorMessage,
    setIsLoading: setIsSimulating,
    setSimulationResult,
    setMaxLeverage,
  });

  const handleAmountChange = React.useCallback(
    (amountRaw: string) => {
      const amount = formatAmount(amountRaw, maxAmount, selectedBank ?? null, numberFormater);
      setAmountRaw(amount);
    },
    [maxAmount, selectedBank, numberFormater, setAmountRaw]
  );

  /////////////////////
  // Trading Actions //
  /////////////////////

  const retryTradeAction = React.useCallback(
    (params: ExecuteTradeActionProps, leverage: number) => {
      initiateTradeAction(params, leverage, activePoolExtended, {
        captureEvent: () => {
          capture("trade_action_retry", {
            group: activePoolExtended.groupPk.toBase58(),
            bank: selectedBank?.meta.tokenSymbol,
          });
        },
        setIsActionComplete: setIsActionComplete,
        setPreviousTxn: setPreviousTxn,
        onComplete: () => {
          refreshGroup({
            connection,
            wallet,
            groupPk: activePoolExtended.groupPk,
            banks: [activePoolExtended.tokenBank.address, activePoolExtended.quoteBank.address, RANDOM_USDC_BANK],
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
      selectedBank?.meta.tokenSymbol,
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
    if (!selectedBank || !selectedSecondaryBank) {
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
      depositBank: selectedBank,
      borrowBank: selectedSecondaryBank,
      quote: actionTxns.actionQuote!,
      connection: client.provider.connection,
      tradeSide: tradeState,
    };

    initiateTradeAction(params, leverage, activePoolExtended, {
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
          banks: [activePoolExtended.tokenBank.address, activePoolExtended.quoteBank.address, RANDOM_USDC_BANK],
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
    selectedBank,
    selectedSecondaryBank,
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
          entryPrice={activePoolExtended.tokenBank.info.state.price}
          volume={activePoolExtended.tokenBank.tokenData?.volume24hr}
        />
      </CardHeader>
      <CardContent className="px-4 py-2">
        <div className="space-y-4">
          <ActionToggle tradeState={tradeState} setTradeState={setTradeState} />
          <AmountInput maxAmount={maxAmount} amount={amountRaw} handleAmountChange={handleAmountChange} />
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
              isLoading={isLoading && isSimulating.isLoading}
              selectedBank={activePoolExtended.tokenBank}
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
                  banks: [activePoolExtended.tokenBank.address, activePoolExtended.quoteBank.address, RANDOM_USDC_BANK],
                })
              }
              refreshSimulation={refreshSimulation}
              isRetrying={isSimulating.isLoading}
              usdcBalance={maxAmount}
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
