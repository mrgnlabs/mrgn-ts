"use client";

import React from "react";
import { computeMaxLeverage } from "@mrgnlabs/marginfi-client-v2";
import { ActionMessageType, cn, formatAmount, LoopActionTxns, useConnection, usePrevious } from "@mrgnlabs/mrgn-utils";

// import { GroupData } from "~/store/tradeStore";
import { ArenaPoolV2 } from "~/store/tradeStoreV2";
import { TradeSide } from "~/components/common/trade-box-v2/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

import { ActionToggle, AmountInput, Header, LeverageSlider, Stats, TradingBoxSettingsDialog } from "./components";
import { useTradeStoreV2, useUiStore } from "~/store";
import { IconSettings } from "@tabler/icons-react";
import { InfoMessages } from "./components/info-messages/info-messages";
import { useWallet, useWalletStore } from "~/components/wallet-v2";
import { useExtendedPool } from "~/hooks/useExtendedPools";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { useTradeSimulation, useActionAmounts } from "./hooks";
import { SimulationStatus } from "~/components/action-box-v2/utils";
import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { useTradeBoxStore } from "./store";
import { checkLoopActionAvailable } from "./utils";

interface TradeBoxV2Props {
  activePool: ArenaPoolV2;
  side?: TradeSide;
}

export const TradeBoxV2 = ({ activePool, side = "long" }: TradeBoxV2Props) => {
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
  ]); // TODO: figure out amount vs amountRaw, ask kobe
  const activePoolExtended = useExtendedPool(activePool);
  const client = useMarginfiClient({ groupPk: activePoolExtended.groupPk });
  const { accountSummary, wrappedAccount } = useWrappedAccount({
    client,
    groupPk: activePoolExtended.groupPk,
    banks: [activePoolExtended.tokenBank, activePoolExtended.quoteBank],
  });
  const { walletContextState, wallet, connected } = useWallet();
  const [slippageBps, setSlippageBps, platformFeeBps] = useUiStore((state) => [
    state.slippageBps,
    state.setSlippageBps,
    state.platformFeeBps,
  ]);
  const [setIsWalletOpen] = useWalletStore((state) => [state.setIsWalletOpen]);
  const [fetchTradeState, nativeSolBalance, setIsRefreshingStore, refreshGroup] = useTradeStoreV2((state) => [
    state.fetchTradeState,
    state.nativeSolBalance,
    state.setIsRefreshingStore,
    state.refreshGroup,
  ]);
  const { connection } = useConnection();

  const [additionalChecks, setAdditionalChecks] = React.useState<ActionMessageType>();

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []); // The fuck is this lol?

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

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    activePool: activePoolExtended,
    collateralBank: selectedBank,
    nativeSolBalance,
  });

  const debouncedLeverage = useAmountDebounce<number>(leverage, 500);

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
    setSimulationResult: () => {},
    setMaxLeverage,
  });

  const leveragedAmount = React.useMemo(() => {
    if (tradeState === "long") {
      return actionTxns?.actualDepositAmount;
    } else {
      return actionTxns?.borrowAmount.toNumber();
    }
  }, [tradeState, actionTxns]);

  const isActiveWithCollat = true; // the fuuuuck?

  const actionMethods = React.useMemo(
    () =>
      checkLoopActionAvailable({
        amount,
        connected,
        collateralBank: selectedBank,
        secondaryBank: tradeState === "long" ? activePoolExtended.quoteBank : activePoolExtended.tokenBank,
        // TODO: fix this, have the collateralBank and secondary be in the same var
        actionQuote: null,
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
          <LeverageSlider leverage={leverage} maxLeverage={maxLeverage} setLeverage={setLeverage} />
          <div className="flex items-center justify-between text-muted-foreground text-base">
            <span>Size of {tradeState}</span>
            <span>
              {`${
                leveragedAmount ? leveragedAmount.toFixed(activePoolExtended.tokenBank.info.state.mintDecimals) : 0
              } ${selectedBank?.meta.tokenSymbol}`}
            </span>
          </div>
          {actionMethods && actionMethods.some((method) => method.description) && (
            <InfoMessages
              connected={connected}
              tradeState={tradeState}
              activePool={activePoolExtended}
              isActiveWithCollat={isActiveWithCollat}
              actionMethods={actionMethods}
              additionalChecks={additionalChecks}
              setIsWalletOpen={setIsWalletOpen}
              fetchTradeState={fetchTradeState}
              connection={connection}
              wallet={wallet}
            />
          )}
          <Button className={cn("w-full", tradeState === "long" && "bg-success", tradeState === "short" && "bg-error")}>
            {tradeState === "long" ? "Long" : "Short"}
          </Button>
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
          simulationResult={null}
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
