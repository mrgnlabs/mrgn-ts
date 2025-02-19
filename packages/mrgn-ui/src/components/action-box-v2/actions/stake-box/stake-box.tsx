import React from "react";
import { v4 as uuidv4 } from "uuid";

import { WalletContextState } from "@solana/wallet-adapter-react";

import { getPriceWithConfidence, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { dynamicNumeralFormatter, nativeToUi, NATIVE_MINT as SOL_MINT, uiToNative } from "@mrgnlabs/mrgn-common";
import {
  LstData,
  PreviousTxn,
  ActionMessageType,
  checkStakeActionAvailable,
  usePrevious,
  ExecuteStakeActionProps,
  ExecuteStakeAction,
} from "@mrgnlabs/mrgn-utils";

import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ActionMessage } from "~/components";
import { ActionBoxContentWrapper, ActionButton, ActionSettingsButton , ActionSimulationStatus} from "~/components/action-box-v2/components";

import { useStakeBoxStore } from "./store";
import { AmountPreview } from "./components/amount-preview";
import { StatsPreview } from "./components/stats-preview";
import { useStakeSimulation } from "./hooks";
import { ActionInput } from "./components/action-input";

import { useActionContext, useStakeBoxContext } from "../../contexts";
import { SimulationStatus } from "../../utils";

export type StakeBoxProps = {
  nativeSolBalance: number;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  banks: ExtendedBankInfo[];
  requestedBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;
  requestedActionType: ActionType;

  lstData?: LstData | null;

  onConnect?: () => void;
  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
  setDisplaySettings?: (displaySettings: boolean) => void;
};

export const StakeBox = ({
  banks,
  marginfiClient,
  requestedBank,
  nativeSolBalance,
  connected,
  isDialog,
  requestedActionType,
  onConnect,
  captureEvent,
  onComplete,
  setDisplaySettings,
}: StakeBoxProps) => {
  const [
    amountRaw,
    actionMode,
    selectedBank,
    simulationResult,
    actionTxns,
    errorMessage,
    refreshState,
    refreshSelectedBanks,
    fetchActionBoxState,
    setActionMode,
    setAmountRaw,
    setSimulationResult,
    setActionTxns,
    setSelectedBank,
    setErrorMessage,
  ] = useStakeBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.actionMode,
    state.selectedBank,
    state.simulationResult,
    state.actionTxns,
    state.errorMessage,
    state.refreshState,
    state.refreshSelectedBanks,
    state.fetchActionBoxState,
    state.setActionMode,
    state.setAmountRaw,
    state.setSimulationResult,
    state.setActionTxns,
    state.setSelectedBank,
    state.setErrorMessage,
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

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    actionMode,
  });

  const { transactionSettings, priorityFees, jupiterOptions } = useActionContext() || {
    transactionSettings: null,
    priorityFees: null,
    jupiterOptions: null,
  };

  const { lstData } = useStakeBoxContext()!;

  const [additionalActionMessages, setAdditionalActionMessages] = React.useState<ActionMessageType[]>([]);

  const solPriceUsd = React.useMemo(() => {
    const bank = banks.find((bank) => bank.info.state.mint.equals(SOL_MINT));
    return bank ? getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber() : 0;
  }, [banks]);

  const receiveAmount = React.useMemo(() => {
    if (selectedBank && debouncedAmount && lstData) {
      if (requestedActionType === ActionType.MintLST) {
        if (selectedBank.meta.tokenSymbol === "SOL") {
          const _debouncedAmount = uiToNative(debouncedAmount, 9).toNumber();
          return nativeToUi(_debouncedAmount / lstData.lstSolValue, 9);
        } else if (selectedBank.meta.tokenSymbol !== "SOL" && actionTxns?.actionQuote?.outAmount && lstData) {
          return nativeToUi(Number(actionTxns?.actionQuote?.outAmount) / lstData?.lstSolValue, 9);
        }
      } else if (requestedActionType === ActionType.UnstakeLST) {
        return nativeToUi(Number(actionTxns?.actionQuote?.outAmount), 9);
      }
    }
    return 0; // Default value if conditions are not met
  }, [selectedBank, debouncedAmount, lstData, actionTxns, requestedActionType]);

  React.useEffect(() => {
    return () => {
      refreshState();
    };
  }, [refreshState]);

  const {  refreshSimulation } = useStakeSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedBank,
    actionMode,
    actionTxns,
    simulationResult,
    jupiterOptions,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading: setIsSimulating,
    marginfiClient,
    lstData,
  });

  const actionSummary = React.useMemo(() => {
    if (!lstData) return;
    return {
      commission: lstData.solDepositFee,
      currentPrice: lstData.lstSolValue,
      projectedApy: lstData.projectedApy,
      supply: lstData.tvl * solPriceUsd,
    };
  }, [lstData, solPriceUsd]);

  const actionMessages = React.useMemo(() => {
    return checkStakeActionAvailable({
      amount,
      connected,
      selectedBank,
      actionQuote: actionTxns.actionQuote,
      lstData,
    });
  }, [amount, connected, selectedBank, actionTxns.actionQuote, lstData]);

  /*
  Cleaing additional action messages when the bank or amount changes. This is to prevent outdated errors from being displayed.
  */
  const prevSelectedBank = usePrevious(selectedBank);
  const prevAmount = usePrevious(amount);

  React.useEffect(() => {
    if (
      prevSelectedBank &&
      prevAmount &&
      (prevSelectedBank.meta.tokenSymbol !== selectedBank?.meta.tokenSymbol || prevAmount !== amount)
    ) {
      setAdditionalActionMessages([]);
      setErrorMessage(null);
    }
  }, [prevSelectedBank, prevAmount, selectedBank, amount, setErrorMessage]);

  /////////////////////
  // Staking Actions //
  /////////////////////
  const handleLstAction = React.useCallback(async () => {
    if (!selectedBank || !amount || !marginfiClient || !transactionSettings || !actionTxns) {
      return;
    }
    
    const params: ExecuteStakeActionProps = {
      actionTxns,
      attemptUuid: uuidv4(),
      marginfiClient,
      processOpts: { ...priorityFees, broadcastType: transactionSettings.broadcastType },
      txOpts: {},
      callbacks: {
        captureEvent: captureEvent,
      },
      infoProps: {
        swapAmount: dynamicNumeralFormatter(amount),
        amount: dynamicNumeralFormatter(actionTxns.actionQuote ? nativeToUi(Number(actionTxns?.actionQuote?.outAmount), 9 ) : amount), // Always sol as output so 9 decimals
        token: selectedBank.meta.tokenSymbol,
        actionType: requestedActionType,
      }, 
    }

    ExecuteStakeAction(params)

    setAmountRaw("")
  }, [actionTxns, amount, captureEvent, marginfiClient, priorityFees, requestedActionType, selectedBank, setAmountRaw, transactionSettings])

  React.useEffect(() => {
    fetchActionBoxState({ requestedLendType: requestedActionType, requestedBank });
  }, [requestedActionType, requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      setAdditionalActionMessages([{ ...errorMessage, isEnabled: false }]);
    }
  }, [errorMessage]);

  React.useEffect(() => {
    if (marginfiClient) {
      refreshSelectedBanks(banks);
    }
  }, [marginfiClient, banks, refreshSelectedBanks]);

  return (
    <ActionBoxContentWrapper>
      <div className="mb-5">
        <ActionInput
          banks={banks}
          nativeSolBalance={nativeSolBalance}
          walletAmount={walletAmount}
          amount={amount}
          amountRaw={amountRaw}
          maxAmount={maxAmount}
          connected={connected}
          selectedBank={selectedBank}
          lendMode={requestedActionType}
          isDialog={isDialog}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedBank}
        />
      </div>
      <div className="mb-5">
        <AmountPreview actionMode={actionMode} amount={receiveAmount} isLoading={isSimulating.isLoading} />
      </div>
      {additionalActionMessages.concat(actionMessages).map(
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
      <div className="mb-3">
        <ActionButton
          isLoading={isLoading}
          isEnabled={
            !additionalActionMessages.concat(actionMessages).filter((value) => value.isEnabled === false).length
          }
          connected={connected}
          handleAction={handleLstAction}
          buttonLabel={requestedActionType === ActionType.MintLST ? "Stake" : "Unstake"}
        />
      </div>

      <div className="flex items-center justify-between">
        <ActionSimulationStatus
          simulationStatus={isSimulating.status}
          hasErrorMessages={additionalActionMessages.length > 0}
          isActive={selectedBank && amount > 0 ? true : false}
        />
        {setDisplaySettings && <ActionSettingsButton onClick={() => setDisplaySettings(true)} />}
      </div>

      <div>
        <StatsPreview
          actionSummary={{
            actionPreview: actionSummary,
            simulationPreview: {
              priceImpact: actionTxns?.actionQuote?.priceImpactPct
                ? Number(actionTxns?.actionQuote?.priceImpactPct)
                : undefined,
              splippage: actionTxns?.actionQuote?.slippageBps
                ? Number(actionTxns?.actionQuote?.slippageBps)
                : undefined,
            },
          }}
          actionMode={actionMode}
          isLoading={isLoading}
          selectedBank={selectedBank}
        />
      </div>
    </ActionBoxContentWrapper>
  );
};