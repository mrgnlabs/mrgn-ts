import React, { useEffect } from "react";

import { WalletContextState } from "@solana/wallet-adapter-react";

import { getPriceWithConfidence, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMethod, checkStakeActionAvailable, LstData, PreviousTxn } from "@mrgnlabs/mrgn-utils";
import {
  ActionMethod,
  LstData,
  PreviousTxn,
  showErrorToast,
  STATIC_SIMULATION_ERRORS,
  usePriorityFee,
} from "@mrgnlabs/mrgn-utils";
import { nativeToUi, NATIVE_MINT as SOL_MINT, uiToNative } from "@mrgnlabs/mrgn-common";

import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ActionMessage } from "~/components";

import { useStakeBoxStore } from "./store";
import { AmountPreview } from "./components/amount-preview";
import { ActionButton, ActionSettingsButton } from "../../components";
import { StatsPreview } from "./components/stats-preview";
import { useStakeSimulation } from "./hooks";
import { useActionBoxStore } from "../../store";
import { handleExecuteLstAction } from "./utils/stake-action.utils";
import { ActionInput } from "./components/action-input";
import { useStakeBoxContext } from "../../contexts";
import { checkActionAvailable } from "./utils";
import { useActionContext, useStakeBoxContext } from "../../contexts";

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
}: StakeBoxProps) => {
  const [
    amountRaw,
    actionMode,
    selectedBank,
    simulationResult,
    actionTxns,
    errorMessage,
    isLoading,
    refreshState,
    refreshSelectedBanks,
    fetchActionBoxState,
    setActionMode,
    setAmountRaw,
    setSimulationResult,
    setActionTxns,
    setSelectedBank,
    setIsLoading,
    setErrorMessage,
  ] = useStakeBoxStore(isDialog)((state) => [
    state.amountRaw,
    state.actionMode,
    state.selectedBank,
    state.simulationResult,
    state.actionTxns,
    state.errorMessage,
    state.isLoading,
    state.refreshState,
    state.refreshSelectedBanks,
    state.fetchActionBoxState,
    state.setActionMode,
    state.setAmountRaw,
    state.setSimulationResult,
    state.setActionTxns,
    state.setSelectedBank,
    state.setIsLoading,
    state.setErrorMessage,
  ]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    actionMode,
  });

  const { priorityType, broadcastType, maxCap, maxCapType } = useActionContext();

  const priorityFee = usePriorityFee(
    priorityType,
    broadcastType,
    maxCapType,
    maxCap,
    marginfiClient?.provider.connection
  );

  const [setIsSettingsDialogOpen, setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.setIsSettingsDialogOpen,
    state.setPreviousTxn,
    state.setIsActionComplete,
  ]);

  const { lstData } = useStakeBoxContext()!;

  const [additionalActionMethods, setAdditionalActionMethods] = React.useState<ActionMethod[]>([]);

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

  const { handleSimulation } = useStakeSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedBank,
    actionMode,
    actionTxns,
    simulationResult,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading,
    marginfiClient,
    lstData,
    priorityFee,
    broadcastType,
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

  const handleLstAction = React.useCallback(async () => {
    if (!selectedBank || !amount || !marginfiClient) {
      return;
    }

    const action = async () => {
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
      };

      await handleExecuteLstAction({
        params,
        captureEvent: (event, properties) => {
          captureEvent && captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          setIsActionComplete(true);
          setPreviousTxn({
            txn: txnSigs[txnSigs.length - 1] ?? "",
            txnType: requestedActionType === ActionType.MintLST ? "STAKE" : "UNSTAKE",
            stakingOptions: {
              amount: receiveAmount,
              type: requestedActionType,
              originDetails: {
                amount,
                bank: selectedBank,
              },
            },
          });

          onComplete &&
            onComplete({
              txn: txnSigs[txnSigs.length - 1] ?? "",
              txnType: requestedActionType === ActionType.MintLST ? "STAKE" : "UNSTAKE",
              stakingOptions: {
                amount: receiveAmount,
                type: requestedActionType,
                originDetails: {
                  amount,
                  bank: selectedBank,
                },
              },
            });
        },
        setIsError: () => {},
        setIsLoading: (isLoading) => setIsLoading({ type: "TRANSACTION", state: isLoading }),
      });
    };

    await action();
    setAmountRaw("");

    setIsLoading({ type: "SIMULATION", state: false });
  }, [
    selectedBank,
    amount,
    marginfiClient,
    setAmountRaw,
    setIsLoading,
    actionTxns,
    requestedActionType,
    nativeSolBalance,
    broadcastType,
    captureEvent,
    setIsActionComplete,
    setPreviousTxn,
    receiveAmount,
    onComplete,
  ]);

  const actionMethods = React.useMemo(() => {
    setAdditionalActionMethods([]);
    return checkStakeActionAvailable({
      amount,
      connected,
      selectedBank,
      actionQuote: actionTxns.actionQuote,
      lstData,
    });
  }, [amount, connected, selectedBank, actionTxns.actionQuote, lstData]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedLendType: requestedActionType, requestedBank });
  }, [requestedActionType, requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      setAdditionalActionMethods([{ ...errorMessage, isEnabled: false }]);
    }
  }, [errorMessage]);

  React.useEffect(() => {
    handleSimulation([
      ...(actionTxns?.additionalTxns ?? []),
      ...(actionTxns?.actionTxn ? [actionTxns?.actionTxn] : []),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionTxns]);

  return (
    <>
      <div className="mb-6">
        <ActionInput
          banks={banks}
          nativeSolBalance={nativeSolBalance}
          walletAmount={walletAmount}
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
      <div className="mb-6">
        <AmountPreview
          actionMode={actionMode}
          amount={receiveAmount}
          isLoading={isLoading.type === "SIMULATION" ? isLoading.state : false}
        />
      </div>
      {additionalActionMethods.concat(actionMethods).map(
        (actionMethod, idx) =>
          actionMethod.description && (
            <div className="pb-6" key={idx}>
              <ActionMessage actionMethod={actionMethod} />
            </div>
          )
      )}
      <div className="mb-3">
        <ActionButton
          isLoading={isLoading.state}
          isEnabled={!additionalActionMethods.concat(actionMethods).filter((value) => value.isEnabled === false).length}
          connected={connected}
          handleAction={handleLstAction}
          buttonLabel={requestedActionType === ActionType.MintLST ? "Mint LST" : "Unstake LST"}
        />
      </div>

      <ActionSettingsButton setIsSettingsActive={setIsSettingsDialogOpen} />

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
          isLoading={isLoading.type === "SIMULATION" ? isLoading.state : false}
          selectedBank={selectedBank}
        />
      </div>
    </>
  );
};
