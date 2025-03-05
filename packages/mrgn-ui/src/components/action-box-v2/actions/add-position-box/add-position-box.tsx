import React from "react";
import { v4 as uuidv4 } from "uuid";
import BigNumber from "bignumber.js";

import {
  ExtendedBankInfo,
  ActionType,
  AccountSummary,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  checkLoopActionAvailable,
  usePrevious,
  ExecuteLoopActionProps,
  ExecuteLoopAction,
  checkTradeActionAvailable,
  TradeSide,
  ArenaGroupStatus,
} from "@mrgnlabs/mrgn-utils";
import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import { ActionBoxContentWrapper, ActionButton, ActionSettingsButton } from "~/components/action-box-v2/components";
import { usePollBlockHeight } from "~/components/action-box-v2/hooks";
import { ActionMessage } from "~/components";

import { SimulationStatus } from "../../utils/simulation.utils";
import { ActionSimulationStatus } from "../../components";
import { useActionContext } from "../../contexts";

import { ActionInput, Preview } from "./components";
import { useAddPositionBoxStore } from "./store";
import { useAddPositionSimulation, useActionAmounts } from "./hooks";
import { LeverageSlider } from "./components/leverage-slider";
import { ApyStat } from "./components/apy-stat";
import { useActionBoxStore } from "../../store";

export type AddPositionBoxProps = {
  nativeSolBalance: number;
  connected: boolean;
  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  depositBank: ExtendedBankInfo;
  borrowBank: ExtendedBankInfo;
  tradeSide: TradeSide;
  isDialog?: boolean;

  onComplete?: () => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
  setDisplaySettings?: (displaySettings: boolean) => void;
};

export const AddPositionBox = ({
  nativeSolBalance,
  connected,
  marginfiClient,
  selectedAccount,
  depositBank,
  borrowBank,
  isDialog,
  tradeSide,
  onComplete,
  captureEvent,
  setDisplaySettings,
}: AddPositionBoxProps) => {
  const [
    leverage,
    maxLeverage,
    amountRaw,
    errorMessage,
    simulationResult,
    actionTxns,
    refreshState,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setAmountRaw,
    setMaxLeverage,
    setLeverage,
  ] = useAddPositionBoxStore((state) => [
    state.leverage,
    state.maxLeverage,
    state.amountRaw,
    state.errorMessage,
    state.simulationResult,
    state.actionTxns,
    state.refreshState,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.setAmountRaw,
    state.setMaxLeverage,
    state.setLeverage,
  ]);
  const [platformFeeBps] = useActionBoxStore((state) => [state.platformFeeBps]);

  const { transactionSettings, priorityFees, jupiterOptions } = useActionContext() || {
    transactionSettings: null,
    priorityFees: null,
    jupiterOptions: null,
  };

  const [simulationStatus, setSimulationStatus] = React.useState<{
    isLoading: boolean;
    status: SimulationStatus;
  }>({
    isLoading: false,
    status: SimulationStatus.IDLE,
  });

  // React.useEffect(() => {
  //   return () => {
  //     refreshState();
  //   };
  // }, [refreshState]);

  const banks = React.useMemo(() => [depositBank, borrowBank], [depositBank, borrowBank]);
  const quoteBank = React.useMemo(
    () => (tradeSide === TradeSide.LONG ? borrowBank : depositBank),
    [borrowBank, depositBank, tradeSide]
  );

  const accountSummary = React.useMemo(() => {
    return selectedAccount ? computeAccountSummary(selectedAccount, banks) : DEFAULT_ACCOUNT_SUMMARY;
  }, [selectedAccount, banks]);

  const { amount, debouncedAmount, maxAmount } = useActionAmounts({
    amountRaw,
    quoteBank,
  });

  const debouncedLeverage = useAmountDebounce<number | null>(leverage, 1000);

  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);
  const [quoteActionMessage, setQuoteActionMessage] = React.useState<ActionMessageType[]>([]);

  const actionMessages = React.useMemo(() => {
    return checkTradeActionAvailable({
      amount,
      connected,
      depositBank,
      borrowBank,
      actionQuote: actionTxns.actionQuote,
      tradeState: tradeSide === TradeSide.LONG ? "long" : "short",
      leverage,
      groupStatus: tradeSide === TradeSide.LONG ? ArenaGroupStatus.LONG : ArenaGroupStatus.SHORT,
    });
  }, [amount, connected, depositBank, borrowBank, actionTxns.actionQuote, tradeSide, leverage]);

  const { refreshSimulation } = useAddPositionSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    debouncedLeverage: debouncedLeverage ?? 0,
    selectedAccount,
    marginfiClient,
    depositBank,
    borrowBank,
    jupiterOptions,
    setMaxLeverage,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    tradeSide,
    platformFeeBps, // Added missing property with a default value
    setIsLoading: setSimulationStatus,
  });

  React.useEffect(() => {
    if (!connected) {
      refreshState();
    }
  }, [refreshState, connected]);

  React.useEffect(() => {
    if (errorMessage?.description) {
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
  // const prevSelectedBank = usePrevious(selectedBank);
  // const prevSecondaryBank = usePrevious(selectedSecondaryBank);
  // const prevAmount = usePrevious(amount);

  // React.useEffect(() => {
  //   if (
  //     prevSelectedBank &&
  //     prevSecondaryBank &&
  //     prevAmount &&
  //     (prevSelectedBank.meta.tokenSymbol !== selectedBank?.meta.tokenSymbol ||
  //       prevSecondaryBank.meta.tokenSymbol !== selectedSecondaryBank?.meta.tokenSymbol ||
  //       prevAmount !== amount)
  //   ) {
  //     setAdditionalActionMessages([]);
  //     setErrorMessage(null);
  //   }
  // }, [prevSelectedBank, prevSecondaryBank, prevAmount, selectedBank, selectedSecondaryBank, amount, setErrorMessage]);

  /////////////////////
  // Looping Actions //
  /////////////////////
  const handleLoopAction = React.useCallback(async () => {}, []);

  // React.useEffect(() => {
  //   if (marginfiClient) {
  //     refreshSelectedBanks(banks);
  //   }
  // }, [marginfiClient, banks, refreshSelectedBanks]);

  return (
    <ActionBoxContentWrapper>
      {/* {actionTxns.lastValidBlockHeight && blockProgress !== 0 && (
        <div className="absolute top-0 right-4 z-50">
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
      )} */}
      <div className="mb-6">
        {/* <ActionInput
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
          isLoading={simulationStatus.isLoading}
          walletAmount={walletAmount}
          actionTxns={actionTxns}
        /> */}
      </div>

      <div className="px-1 space-y-6 mb-4">
        {/* <LeverageSlider
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
          amountRaw={amountRaw}
          leverageAmount={leverage}
          maxLeverage={maxLeverage}
          setLeverageAmount={setLeverage}
        /> */}

        {/* <ApyStat
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
          leverageAmount={leverage}
          depositLstApy={depositLstApy}
          borrowLstApy={borrowLstApy}
        /> */}
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
                  isRetrying={simulationStatus.isLoading}
                />
              </div>
            )
        )}

      <div className="mb-3 space-y-2">
        <ActionButton
          isLoading={simulationStatus.isLoading}
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
        {/* <ActionSimulationStatus
          simulationStatus={simulationStatus.status}
          hasErrorMessages={additionalActionMessages.length > 0}
          isActive={selectedBank && amount > 0 ? true : false}
          actionType={ActionType.Loop}
        /> */}
        {setDisplaySettings && <ActionSettingsButton onClick={() => setDisplaySettings(true)} />}
      </div>

      {/* <Preview actionSummary={actionSummary} selectedBank={selectedBank} isLoading={simulationStatus.isLoading} /> */}
    </ActionBoxContentWrapper>
  );
};
