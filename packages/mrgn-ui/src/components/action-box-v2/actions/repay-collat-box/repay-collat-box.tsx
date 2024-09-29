import React from "react";

import { ExtendedBankInfo, ActionType, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMethod, PreviousTxn, showErrorToast } from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

import { ActionButton, ActionMessage, ActionSettingsButton } from "~/components/action-box-v2/components";
import { useActionBoxStore } from "~/components/action-box-v2/store";
import { useActionAmounts } from "~/components/action-box-v2/hooks";

import { checkActionAvailable } from "./utils";
import { Collateral, ActionInput, Preview } from "./components";
import { useRepayCollatBoxStore } from "./store";
import { useRepayCollatSimulation } from "./hooks";
import { LSTDialog, LSTDialogVariants } from "~/components/LSTDialog";

// error handling
export type RepayCollatBoxProps = {
  nativeSolBalance: number;
  // tokenAccountMap: TokenAccountMap;
  connected: boolean;

  marginfiClient: MarginfiClient | null;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedBank?: ExtendedBankInfo;
  accountSummary?: AccountSummary;

  isDialog?: boolean;

  onConnect?: () => void;
  onComplete: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const RepayCollatBox = ({
  nativeSolBalance,
  connected,
  // tokenAccountMap,
  banks,
  marginfiClient,
  selectedAccount,
  accountSummary,
  requestedBank,
  isDialog,
  onConnect,
  onComplete,
  captureEvent,
}: RepayCollatBoxProps) => {
  const priorityFee = 0;

  const [
    maxAmountCollateral,
    repayAmount,
    amountRaw,
    actionQuote,
    selectedBank,
    selectedSecondaryBank,
    errorMessage,
    isLoading,
    simulationResult,
    actionTxns,
    refreshState,
    setSimulationResult,
    setActionTxns,
    setErrorMessage,
    fetchActionBoxState,
    setAmountRaw,
    setActionQuote,
    setSelectedBank,
    setSelectedSecondaryBank,
    setRepayAmount,
    setMaxAmountCollateral,
    setIsLoading,
  ] = useRepayCollatBoxStore((state) => [
    state.maxAmountCollateral,
    state.repayAmount,
    state.amountRaw,
    state.actionQuote,
    state.selectedBank,
    state.selectedSecondaryBank,
    state.errorMessage,
    state.isLoading,
    state.simulationResult,
    state.actionTxns,
    state.refreshState,
    state.setSimulationResult,
    state.setActionTxns,
    state.setErrorMessage,
    state.fetchActionBoxState,
    state.setAmountRaw,
    state.setActionQuote,
    state.setSelectedBank,
    state.setSelectedSecondaryBank,
    state.setRepayAmount,
    state.setMaxAmountCollateral,
    state.setIsLoading,
  ]);

  const [setIsSettingsDialogOpen] = useActionBoxStore((state) => [state.setIsSettingsDialogOpen]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    actionMode: ActionType.RepayCollat,
    maxAmountCollateral,
  });

  // debouncedAmount ?? 0,
  // selectedAccount,
  // marginfiClient,
  // accountSummary

  const { actionSummary } = useRepayCollatSimulation({
    debouncedAmount: debouncedAmount ?? 0,
    selectedAccount,
    marginfiClient,
    accountSummary,
    selectedBank,
    selectedSecondaryBank,
    actionTxns,
    simulationResult,
    setSimulationResult,
    setActionQuote,
    setActionTxns,
    setErrorMessage,
    setRepayAmount,
    setIsLoading,
    setMaxAmountCollateral,
  });

  const [additionalActionMethods, setAdditionalActionMethods] = React.useState<ActionMethod[]>([]);

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState();
    }
  }, [refreshState, connected]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedBank });
  }, [requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage !== null && errorMessage.description) {
      showErrorToast(errorMessage?.description);
      setAdditionalActionMethods([errorMessage]);
    }
  }, [errorMessage]);

  const actionMethods = React.useMemo(
    () =>
      checkActionAvailable({
        amount,
        connected,
        selectedBank,
        selectedSecondaryBank,
        actionQuote,
      }),
    [amount, connected, selectedBank, selectedSecondaryBank, actionQuote]
  );

  const handleRepayCollatAction = React.useCallback(async () => {
    console.log("handleRepayCollatAction");
  }, []);

  return (
    <>
      <ActionInput
        banks={banks}
        nativeSolBalance={nativeSolBalance}
        amountRaw={amountRaw}
        maxAmount={maxAmount}
        repayAmount={repayAmount}
        selectedBank={selectedBank}
        selectedSecondaryBank={selectedSecondaryBank}
        setAmountRaw={setAmountRaw}
        setSelectedBank={setSelectedBank}
        setSelectedSecondaryBank={(bank) => {
          setSelectedSecondaryBank(bank);
        }}
      />

      {additionalActionMethods.concat(actionMethods).map(
        (actionMethod, idx) =>
          actionMethod.description && (
            <div className="pb-6" key={idx}>
              <ActionMessage actionMethod={actionMethod} />
            </div>
          )
      )}

      <Collateral selectedAccount={selectedAccount} actionSummary={actionSummary} />

      <ActionButton
        isLoading={isLoading}
        isEnabled={!additionalActionMethods.concat(actionMethods).filter((value) => value.isEnabled === false).length}
        handleAction={() => {
          handleRepayCollatAction();
        }}
        buttonLabel={"Repay with collateral"}
        handleConnect={() => onConnect && onConnect()}
      />

      <ActionSettingsButton setIsSettingsActive={setIsSettingsDialogOpen} />

      <Preview actionSummary={actionSummary} selectedBank={selectedBank} isLoading={isLoading} />
    </>
  );
};
