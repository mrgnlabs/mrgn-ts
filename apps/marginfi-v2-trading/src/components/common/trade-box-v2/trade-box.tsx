"use client";

import React from "react";
import { computeMaxLeverage } from "@mrgnlabs/marginfi-client-v2";
import { ActionMessageType, cn, formatAmount, LoopActionTxns, useConnection } from "@mrgnlabs/mrgn-utils";

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
import { checkLoopingActionAvailable } from "../TradingBox/tradingBox.utils";
import { useExtendedPool } from "~/hooks/useExtendedPools";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";

interface TradeBoxV2Props {
  activePool: ArenaPoolV2;
  side?: TradeSide;
}

export const TradeBoxV2 = ({ activePool, side = "long" }: TradeBoxV2Props) => {
  const activePoolExtended = useExtendedPool(activePool);
  const client = useMarginfiClient({ groupPk: activePoolExtended.groupPk });
  const { accountSummary, wrappedAccount } = useWrappedAccount({
    client,
    groupPk: activePoolExtended.groupPk,
    banks: [activePoolExtended.tokenBank, activePoolExtended.quoteBank],
  });
  const { walletContextState, wallet, connected } = useWallet();
  const [slippageBps, setSlippageBps] = useUiStore((state) => [state.slippageBps, state.setSlippageBps]);
  const [setIsWalletOpen] = useWalletStore((state) => [state.setIsWalletOpen]);
  const [fetchTradeState, nativeSolBalance, setIsRefreshingStore, refreshGroup] = useTradeStoreV2((state) => [
    state.fetchTradeState,
    state.nativeSolBalance,
    state.setIsRefreshingStore,
    state.refreshGroup,
  ]);
  const { connection } = useConnection();

  const [tradeState, setTradeState] = React.useState<TradeSide>(side);
  const [leverage, setLeverage] = React.useState(0);
  const [amount, setAmount] = React.useState<string>(""); // use store for this maybe
  const [tradeActionTxns, setTradeActionTxns] = React.useState<LoopActionTxns | null>(null);
  const [additionalChecks, setAdditionalChecks] = React.useState<ActionMessageType>();

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []); // The fuck is this lol?

  const collateralBank = React.useMemo(() => {
    if (activePoolExtended) {
      if (tradeState === "short") {
        return activePoolExtended.quoteBank;
      } else {
        return activePoolExtended.tokenBank;
      }
    }
  }, [activePoolExtended, tradeState]);

  const maxLeverage = React.useMemo(() => {
    if (activePoolExtended) {
      const deposit =
        tradeState === "long" ? activePoolExtended.tokenBank.info.rawBank : activePoolExtended.quoteBank.info.rawBank;
      const borrow =
        tradeState === "long" ? activePoolExtended.quoteBank.info.rawBank : activePoolExtended.tokenBank.info.rawBank;

      const { maxLeverage } = computeMaxLeverage(deposit, borrow);
      return maxLeverage;
    }
    return 0;
  }, [activePoolExtended, tradeState]);

  const isActiveWithCollat = true; // the fuuuuck?

  const maxAmount = React.useMemo(() => {
    if (collateralBank) {
      return collateralBank.userInfo.maxDeposit;
    }
    return 0;
  }, [collateralBank]); // Remove this and just use the collateralBank.userInfo.maxDeposit

  const actionMethods = React.useMemo(
    () =>
      checkLoopingActionAvailable({
        amount,
        connected,
        activePoolExtended,
        loopActionTxns: tradeActionTxns,
        tradeSide: tradeState,
      }), // TODO: do we need a more tailored check for trading instead of looping?
    [amount, connected, activePoolExtended, tradeActionTxns, tradeState]
  );

  const handleAmountChange = React.useCallback(
    (amountRaw: string) => {
      const amount = formatAmount(amountRaw, maxAmount, collateralBank ?? null, numberFormater);
      setAmount(amount);
    },
    [maxAmount, collateralBank, numberFormater]
  );

  return (
    <Card className="shadow-none border-border w-full">
      <CardHeader className="p-1">
        <Header activePool={activePoolExtended} />
      </CardHeader>
      <CardContent className="">
        <div className="space-y-4">
          <ActionToggle tradeState={tradeState} setTradeState={setTradeState} />
          <AmountInput
            maxAmount={maxAmount}
            amount={amount}
            handleAmountChange={handleAmountChange}
            collateralBank={collateralBank}
          />
          <LeverageSlider leverage={leverage} maxLeverage={maxLeverage} setLeverage={setLeverage} />
          <div className="flex items-center justify-between text-muted-foreground text-base">
            <span>{tradeState === "long" ? "Long" : "Short"} amount</span>
            <span>100 {collateralBank?.meta.tokenSymbol}</span>
          </div>
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
          <Button className={cn("w-full", tradeState === "long" && "bg-success", tradeState === "short" && "bg-error")}>
            {tradeState === "long" ? "Long" : "Short"}
          </Button>
          <TradingBoxSettingsDialog
            setSlippageBps={(value) => setSlippageBps(value * 100)}
            slippageBps={slippageBps / 100}
          >
            <div className="flex justify-end gap-2 mt-2 ml-auto">
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
          actionTxns={tradeActionTxns}
        />
      </CardContent>
    </Card>
  );
};

/*
TODO: 
- when wallet is connected but store is loading, show to user

*/
