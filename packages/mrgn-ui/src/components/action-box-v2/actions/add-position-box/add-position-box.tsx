import React from "react";
import { v4 as uuidv4 } from "uuid";

import {
  ExtendedBankInfo,
  computeAccountSummary,
  DEFAULT_ACCOUNT_SUMMARY,
  AccountSummary,
  ActionType,
} from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  checkTradeActionAvailable,
  TradeSide,
  ArenaGroupStatus,
  ExecuteTradeActionProps,
  executeTradeAction,
  ExecuteLendingActionProps,
  executeLendingAction,
} from "@mrgnlabs/mrgn-utils";

import { useAmountDebounce } from "~/hooks/useAmountDebounce";
import {
  ActionBoxContentWrapper,
  ActionButton,
  ActionSettingsButton,
  ActionSimulationStatus,
} from "~/components/action-box-v2/components";
import { ActionMessage } from "~/components";

import { SimulationStatus } from "../../utils/simulation.utils";
import { useActionContext } from "../../contexts";
import { useActionBoxStore } from "../../store";

import { ActionInput, LeverageSlider, Preview } from "./components";
import { useAddPositionBoxStore } from "./store";
import { useAddPositionSimulation, useActionAmounts } from "./hooks";
import { calculateSummary } from "./utils";
import { dynamicNumeralFormatter, TransactionType } from "@mrgnlabs/mrgn-common";

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

  React.useEffect(() => {
    return () => {
      refreshState();
    };
  }, [refreshState]);

  const banks = React.useMemo(() => [depositBank, borrowBank], [depositBank, borrowBank]);
  const { quoteBank, tokenBank } = React.useMemo(
    () =>
      tradeSide === TradeSide.LONG
        ? { quoteBank: borrowBank, tokenBank: depositBank }
        : { quoteBank: depositBank, tokenBank: borrowBank },
    [borrowBank, depositBank, tradeSide]
  );

  const accountSummary = React.useMemo(() => {
    return selectedAccount ? computeAccountSummary(selectedAccount, banks) : DEFAULT_ACCOUNT_SUMMARY;
  }, [selectedAccount, banks]);

  const handleActionSummary = React.useCallback(
    (summary?: AccountSummary, result?: SimulationResult) => {
      if (selectedAccount && summary) {
        return calculateSummary({
          simulationResult: result ?? undefined,
          bank: depositBank,
          accountSummary: summary,
          actionTxns: actionTxns,
        });
      }
    },
    [selectedAccount, depositBank, actionTxns]
  );

  const actionSummary = React.useMemo(() => {
    return handleActionSummary(accountSummary, simulationResult ?? undefined);
  }, [accountSummary, simulationResult, handleActionSummary]);

  const { amount, debouncedAmount, maxAmount } = useActionAmounts({
    amountRaw,
    nativeSolBalance,
    quoteBank,
  });

  const debouncedLeverage = useAmountDebounce<number>(leverage, 1000);

  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

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
    debouncedLeverage: debouncedLeverage ?? 1,
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
    platformFeeBps,
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
  const handleAddPositionAction = React.useCallback(async () => {
    if (!marginfiClient || !actionTxns || !transactionSettings) {
      return;
    }

    const isLooping = actionTxns.transactions.find(
      (txn) => txn.type === TransactionType.LONG || txn.type === TransactionType.SHORT
    );

    if (isLooping) {
      const props: ExecuteTradeActionProps = {
        actionTxns,
        attemptUuid: uuidv4(),
        marginfiClient,
        processOpts: { ...priorityFees, broadcastType: transactionSettings.broadcastType },
        txOpts: {},
        callbacks: {
          captureEvent: captureEvent,
          onComplete: onComplete,
        },
        infoProps: {
          depositAmount: dynamicNumeralFormatter(Number(amountRaw)),
          depositToken: depositBank.meta.tokenSymbol,
          borrowAmount: dynamicNumeralFormatter(actionTxns.borrowAmount.toNumber()),
          borrowToken: borrowBank.meta.tokenSymbol,
          tradeSide: tradeSide,
        },
        nativeSolBalance: nativeSolBalance,
      };
      executeTradeAction(props);
    } else {
      const props: ExecuteLendingActionProps = {
        actionTxns,
        attemptUuid: uuidv4(),
        marginfiClient,
        processOpts: { ...priorityFees, broadcastType: transactionSettings.broadcastType },
        txOpts: {},
        callbacks: {
          captureEvent: captureEvent,
          onComplete: onComplete,
        },
        infoProps: {
          amount: dynamicNumeralFormatter(amount),
          token: depositBank.meta.tokenSymbol,
        },
        nativeSolBalance: nativeSolBalance,
        actionType: ActionType.Deposit,
      };

      executeLendingAction(props);
    }

    setAmountRaw("");
  }, [
    actionTxns,
    amount,
    amountRaw,
    borrowBank.meta.tokenSymbol,
    captureEvent,
    depositBank.meta.tokenSymbol,
    marginfiClient,
    nativeSolBalance,
    onComplete,
    priorityFees,
    setAmountRaw,
    tradeSide,
    transactionSettings,
  ]);

  return (
    <ActionBoxContentWrapper>
      <div className="mb-6">
        <ActionInput
          amount={amount}
          amountRaw={amountRaw}
          maxAmount={maxAmount}
          isLoading={simulationStatus.isLoading}
          quoteBank={quoteBank}
          setAmountRaw={setAmountRaw}
        />
      </div>

      <div className="px-1 space-y-6 mb-4">
        <LeverageSlider leverageAmount={leverage} maxLeverage={maxLeverage} setLeverageAmount={setLeverage} />
      </div>
      {additionalActionMessages.concat(actionMessages).map(
        (actionMessage, idx) =>
          actionMessage.description && (
            <div className="pb-6" key={idx}>
              <ActionMessage
                actionMessage={actionMessage}
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
            !additionalActionMessages.concat(actionMessages).filter((value) => value.isEnabled === false).length &&
            actionTxns?.transactions.length > 0
          }
          connected={connected}
          handleAction={() => {
            handleAddPositionAction();
          }}
          loaderType="DEFAULT"
          buttonLabel={`Increase ${tokenBank.meta.tokenSymbol} ${tradeSide === TradeSide.LONG ? "long" : "short"} position`}
        />
      </div>

      <div className="flex items-center justify-between">
        <ActionSimulationStatus
          simulationStatus={simulationStatus.status}
          hasErrorMessages={additionalActionMessages.length > 0}
          isActive={selectedAccount && amount > 0 ? true : false}
          spinnerType="default"
        />
        {setDisplaySettings && <ActionSettingsButton onClick={() => setDisplaySettings(true)} />}
      </div>

      <Preview
        actionSummary={actionSummary}
        depositBank={depositBank}
        borrowBank={borrowBank}
        depositAmount={actionTxns.actualDepositAmount || amount}
        borrowAmount={actionTxns.borrowAmount.toNumber()}
        isLoading={simulationStatus.isLoading}
      />
    </ActionBoxContentWrapper>
  );
};
