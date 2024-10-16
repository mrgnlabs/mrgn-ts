import React, { useEffect } from "react";

import { ActionInput } from "./components/action-input";
import { getPriceWithConfidence, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMethod, PreviousTxn, showErrorToast } from "@mrgnlabs/mrgn-utils";
import { useStakeBoxStore } from "./store";
import { useActionAmounts } from "~/components/action-box-v2/hooks";
import { AmountPreview } from "./components/amount-preview";
import { ActionButton, ActionSettingsButton } from "../../components";
import { StatsPreview } from "./components/stats-preview";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { useStakeSimulation } from "./hooks";
import { nativeToUi, NATIVE_MINT as SOL_MINT } from "@mrgnlabs/mrgn-common";
import { useActionBoxStore } from "../../store";
import { handleExecuteLstAction } from "./utils/stake-action.utils";

export type StakeBoxProps = {
  nativeSolBalance: number;
  walletContextState?: WalletContextStateOverride | WalletContextState;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedBank?: ExtendedBankInfo;
  accountSummaryArg?: AccountSummary;
  isDialog?: boolean;
  requestedActionType: ActionType;

  onConnect?: () => void;
  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const StakeBox = ({
  banks,
  marginfiClient,
  selectedAccount,
  accountSummaryArg,
  requestedBank,
  nativeSolBalance,
  connected,
  isDialog,
  requestedActionType,
  captureEvent,
  onComplete,
  onConnect,
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

  const [setIsSettingsDialogOpen, setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.setIsSettingsDialogOpen,
    state.setPreviousTxn,
    state.setIsActionComplete,
  ]);

  const [additionalActionMethods, setAdditionalActionMethods] = React.useState<ActionMethod[]>([]);

  const solPriceUsd = React.useMemo(() => {
    const bank = banks.find((bank) => bank.info.state.mint.equals(SOL_MINT));
    return bank ? getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber() : 0;
  }, [banks]);

  const { actionSummary } = useStakeSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    selectedBank,
    actionMode,
    actionTxns,
    simulationResult,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    setIsLoading,
    isRefreshTxn: true, // TODO: fill, see repay-collat-box
    marginfiClient,
    solPriceUsd,
  });

  const handleLstAction = React.useCallback(async () => {
    if (!selectedBank || !amount || !marginfiClient) {
      return;
    }

    try {
    } catch (error) {}

    const action = async () => {
      const params = {
        actionTxns,
        marginfiClient,
      };

      await handleExecuteLstAction({
        params,
        captureEvent: (event, properties) => {
          captureEvent && captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          setIsActionComplete(true);
          setPreviousTxn({
            txn: txnSigs.pop() ?? "",
            txnType: requestedActionType === ActionType.MintLST ? "STAKE" : "UNSTAKE",
            stakingOptions: {
              amount: Number(actionTxns.actionQuote?.outAmount) ?? 0,
              type: requestedActionType,
              bank: selectedBank as ActiveBankInfo,
            },
          }); // TODO: update

          onComplete &&
            onComplete({
              txn: txnSigs.pop() ?? "",
              txnType: requestedActionType === ActionType.MintLST ? "STAKE" : "UNSTAKE",
              stakingOptions: {
                amount: Number(actionTxns.actionQuote?.outAmount) ?? 0,
                type: requestedActionType,
                bank: selectedBank as ActiveBankInfo,
              },
            }); // TODO: update
        },
        setIsError: () => {},
        setIsLoading: (isLoading) => setIsLoading(isLoading),
        actionType: requestedActionType,
      });
    };

    await action();
    setAmountRaw("");
  }, [
    actionTxns,
    amount,
    captureEvent,
    marginfiClient,
    onComplete,
    selectedBank,
    setAmountRaw,
    setIsActionComplete,
    setIsLoading,
    setPreviousTxn,
    requestedActionType,
  ]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedLendType: requestedActionType, requestedBank });
  }, [requestedActionType, requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage && errorMessage.description) {
      showErrorToast(errorMessage?.description);
      setAdditionalActionMethods([errorMessage]);
    }
  }, [errorMessage]);

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
          lendMode={ActionType.MintLST}
          isDialog={isDialog}
          setAmountRaw={setAmountRaw}
          setSelectedBank={setSelectedBank}
        />
      </div>
      <div className="mb-6">
        <AmountPreview
          actionMode={actionMode}
          amount={
            actionTxns.actionQuote?.outAmount
              ? nativeToUi(
                  actionTxns.actionQuote?.outAmount,
                  banks.find((bank) => bank.info.state.mint.toString() === actionTxns.actionQuote?.outputMint)?.info
                    .state.mintDecimals ?? 0
                )
              : undefined
          } // Is this okay to do?
          isLoading={isLoading}
        />
      </div>
      <div className="mb-3">
        <ActionButton
          isLoading={isLoading}
          isEnabled={true}
          connected={connected}
          handleAction={handleLstAction}
          handleConnect={() => {}}
          buttonLabel={requestedActionType === ActionType.MintLST ? "Mint LST" : "Unstake LST"}
        />
      </div>

      <ActionSettingsButton setIsSettingsActive={setIsSettingsDialogOpen} />

      {actionSummary && (
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
      )}
    </>
  );
};
