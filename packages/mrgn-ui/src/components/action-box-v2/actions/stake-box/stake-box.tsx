import React from "react";

import { WalletContextState } from "@solana/wallet-adapter-react";

import { getPriceWithConfidence, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMethod, LstData, PreviousTxn, showErrorToast, STATIC_SIMULATION_ERRORS } from "@mrgnlabs/mrgn-utils";
import { nativeToUi, NATIVE_MINT as SOL_MINT } from "@mrgnlabs/mrgn-common";

import { useActionAmounts, usePollBlockHeight } from "~/components/action-box-v2/hooks";
import { WalletContextStateOverride } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { useStakeBoxStore } from "./store";
import { AmountPreview } from "./components/amount-preview";
import { ActionButton, ActionSettingsButton } from "../../components";
import { StatsPreview } from "./components/stats-preview";
import { useStakeSimulation } from "./hooks";
import { useActionBoxStore, useStakeBoxContextStore } from "../../store";
import { handleExecuteLstAction } from "./utils/stake-action.utils";
import { ActionInput } from "./components/action-input";

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

  lstData?: LstData | null;

  onConnect?: () => void;
  onComplete?: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const StakeBox = ({
  banks,
  marginfiClient,
  selectedAccount,
  requestedBank,
  nativeSolBalance,
  connected,
  isDialog,
  requestedActionType,
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

  const [setIsSettingsDialogOpen, setPreviousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.setIsSettingsDialogOpen,
    state.setPreviousTxn,
    state.setIsActionComplete,
  ]);

  const [lstData] = useStakeBoxContextStore((state) => [state.lstData]);

  const [additionalActionMethods, setAdditionalActionMethods] = React.useState<ActionMethod[]>([]);

  const solPriceUsd = React.useMemo(() => {
    const bank = banks.find((bank) => bank.info.state.mint.equals(SOL_MINT));
    return bank ? getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber() : 0;
  }, [banks]);
  const { isRefreshTxn } = usePollBlockHeight(marginfiClient?.provider.connection, actionTxns.lastValidBlockHeight);

  const receiveAmount = React.useMemo(() => {
    if (selectedBank && debouncedAmount && lstData) {
      if (requestedActionType === ActionType.MintLST) {
        if (selectedBank.meta.tokenSymbol === "SOL") {
          return nativeToUi(debouncedAmount / lstData.lstSolValue, 9);
        } else if (selectedBank.meta.tokenSymbol !== "SOL" && actionTxns?.actionQuote?.outAmount && lstData) {
          return nativeToUi(Number(actionTxns?.actionQuote?.outAmount) / lstData?.lstSolValue, 9);
        }
      } else if (requestedActionType === ActionType.UnstakeLST) {
        return nativeToUi(Number(actionTxns?.actionQuote?.outAmount), 9);
      }
    }
    return 0; // Default value if conditions are not met
  }, [selectedBank, debouncedAmount, lstData, actionTxns, requestedActionType]);

  useStakeSimulation({
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

  const handleLstAction = React.useCallback(async () => {
    if (!selectedBank || !amount || !marginfiClient) {
      return;
    }

    try {
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
          actionType: requestedActionType,
        });
      };

      await action();
      setAmountRaw("");
    } catch (error) {
      const errorMessage =
        requestedActionType === ActionType.MintLST
          ? STATIC_SIMULATION_ERRORS.STAKE_FAILED
          : STATIC_SIMULATION_ERRORS.UNSTAKE_FAILED;

      setErrorMessage(errorMessage);
      setIsLoading({ type: "SIMULATION", state: false });
    }
  }, [
    selectedBank,
    amount,
    marginfiClient,
    setAmountRaw,
    actionTxns,
    requestedActionType,
    receiveAmount,
    captureEvent,
    setIsActionComplete,
    setPreviousTxn,
    onComplete,
    setIsLoading,
    setErrorMessage,
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
      <div className="mb-3">
        <ActionButton
          isLoading={isLoading.state}
          isEnabled={true}
          connected={connected}
          handleAction={handleLstAction}
          handleConnect={() => {}}
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
