import React, { useEffect } from "react";

import { WalletContextState } from "@solana/wallet-adapter-react";

import { getPriceWithConfidence, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { nativeToUi, NATIVE_MINT as SOL_MINT, uiToNative } from "@mrgnlabs/mrgn-common";
import {
  LstData,
  PreviousTxn,
  ActionMessageType,
  checkStakeActionAvailable,
  MultiStepToastHandle,
  ActionTxns,
  IndividualFlowError,
} from "@mrgnlabs/mrgn-utils";

import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ActionMessage } from "~/components";

import { useStakeBoxStore } from "./store";
import { AmountPreview } from "./components/amount-preview";
import { ActionButton, ActionSettingsButton } from "../../components";
import { StatsPreview } from "./components/stats-preview";
import { useStakeSimulation } from "./hooks";
import { useActionBoxStore } from "../../store";
import { ExecuteLstActionParams, handleExecuteLstAction } from "./utils/stake-action.utils";
import { ActionInput } from "./components/action-input";
import { ActionSimulationStatus } from "~/components/action-box-v2/components";

import { useActionContext, useStakeBoxContext } from "../../contexts";
import { SimulationStatus } from "../../utils";
import { IconSettings } from "@tabler/icons-react";

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

  const { broadcastType, priorityFees } = useActionContext() || { broadcastType: null, priorityFees: null };

  const [setIsSettingsDialogOpen, setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.setIsSettingsDialogOpen,
    state.setPreviousTxn,
    state.setIsActionComplete,
  ]);

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

  const { handleSimulation, refreshSimulation } = useStakeSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedBank,
    actionMode,
    actionTxns,
    simulationResult,
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
    setAdditionalActionMessages([]);
    return checkStakeActionAvailable({
      amount,
      connected,
      selectedBank,
      actionQuote: actionTxns.actionQuote,
      lstData,
    });
  }, [amount, connected, selectedBank, actionTxns.actionQuote, lstData]);

  /////////////////////
  // Staking Actions //
  /////////////////////
  const executeAction = async (
    params: ExecuteLstActionParams,
    receiveAmount: number,
    callbacks: {
      captureEvent?: (event: string, properties?: Record<string, any>) => void;
      setIsActionComplete: (isComplete: boolean) => void;
      setPreviousTxn: (previousTxn: PreviousTxn) => void;
      onComplete?: (previousTxn: PreviousTxn) => void;
      setIsLoading: (isLoading: boolean) => void;
      retryCallback: (txns: any, multiStepToast: MultiStepToastHandle) => void;
      setAmountRaw: (amountRaw: string) => void;
    }
  ) => {
    const action = async (params: ExecuteLstActionParams, receiveAmount: number) => {
      await handleExecuteLstAction({
        params,
        captureEvent: (event, properties) => {
          callbacks.captureEvent && callbacks.captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          callbacks.setIsActionComplete(true);
          callbacks.setPreviousTxn({
            txn: txnSigs[txnSigs.length - 1] ?? "",
            txnType: params.actionType === ActionType.MintLST ? "STAKE" : "UNSTAKE",
            stakingOptions: {
              amount: receiveAmount,
              type: params.actionType,
              originDetails: {
                amount: params.originDetails.amount,
                bank: params.bank,
              },
            },
          });

          callbacks.onComplete &&
            callbacks.onComplete({
              txn: txnSigs[txnSigs.length - 1] ?? "",
              txnType: params.actionType === ActionType.MintLST ? "STAKE" : "UNSTAKE",
              stakingOptions: {
                amount: receiveAmount,
                type: params.actionType,
                originDetails: {
                  amount: params.originDetails.amount,
                  bank: params.bank,
                },
              },
            });
        },
        setError: (error: IndividualFlowError) => {
          const toast = error.multiStepToast as MultiStepToastHandle;
          const txs = error.actionTxns as ActionTxns;
          let retry = undefined;
          if (error.retry && txs && toast) {
            retry = () => callbacks.retryCallback(txs, toast);
          }
          toast.setFailed(error.message, retry);
          callbacks.setIsLoading(false);
        },
        setIsLoading: (isLoading) => callbacks.setIsLoading(isLoading),
      });
    };

    await action(params, receiveAmount);
    callbacks.setAmountRaw("");
  };

  const retryLstAction = React.useCallback(
    async (params: ExecuteLstActionParams, receiveAmount: number) => {
      executeAction(params, receiveAmount, {
        captureEvent,
        setIsActionComplete,
        setPreviousTxn,
        onComplete,
        setIsLoading: setIsTransactionExecuting,
        retryCallback: (txns, multiStepToast) =>
          retryLstAction({ ...params, actionTxns: txns, multiStepToast }, receiveAmount),
        setAmountRaw,
      });
    },
    [captureEvent, onComplete, setAmountRaw, setIsActionComplete, setIsTransactionExecuting, setPreviousTxn]
  );

  const handleLstAction = React.useCallback(async () => {
    if (!selectedBank || !amount || !marginfiClient || !broadcastType || !priorityFees) {
      return;
    }
    const params = {
      actionTxns,
      marginfiClient,
      actionType: requestedActionType,
      nativeSolBalance,
      broadcastType,
      originDetails: {
        amount,
        tokenSymbol: selectedBank.meta.tokenSymbol,
      },
      processOpts: {
        broadcastType,
        ...priorityFees,
      },
      bank: selectedBank,
    };

    executeAction(params, receiveAmount, {
      captureEvent,
      setIsActionComplete,
      setPreviousTxn,
      onComplete,
      setIsLoading: setIsTransactionExecuting,
      retryCallback: (txns, multiStepToast) =>
        retryLstAction({ ...params, actionTxns: txns, multiStepToast }, receiveAmount),
      setAmountRaw,
    });
  }, [
    actionTxns,
    amount,
    broadcastType,
    captureEvent,
    marginfiClient,
    nativeSolBalance,
    onComplete,
    priorityFees,
    receiveAmount,
    requestedActionType,
    retryLstAction,
    selectedBank,
    setAmountRaw,
    setIsActionComplete,
    setPreviousTxn,
  ]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedLendType: requestedActionType, requestedBank });
  }, [requestedActionType, requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      setAdditionalActionMessages([{ ...errorMessage, isEnabled: false }]);
    }
  }, [errorMessage]);

  React.useEffect(() => {
    handleSimulation([
      ...(actionTxns?.additionalTxns ?? []),
      ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionTxns]);

  React.useEffect(() => {
    if (marginfiClient) {
      refreshSelectedBanks(banks);
    }
  }, [marginfiClient, banks, refreshSelectedBanks]);

  return (
    <>
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
    </>
  );
};
