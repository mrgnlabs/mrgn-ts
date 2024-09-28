import React from "react";

import { ExtendedBankInfo, ActionType, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMethod, PreviousTxn, showErrorToast } from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

import { ActionButton, ActionMessage, ActionSettingsButton } from "~/components/actionbox-v2/components";
import { useActionBoxStore } from "~/components/actionbox-v2/store";
import { useActionAmounts } from "~/components/actionbox-v2/hooks";

import { checkActionAvailable } from "./utils";
import { Collateral, ActionInput, Preview } from "./components";
import { useRepayCollatBoxStore } from "./store";
import { useRepayCollatSimulation } from "./hooks";

// error handling
export type RepayCollatBoxProps = {
  nativeSolBalance: number;
  // tokenAccountMap: TokenAccountMap;
  connected: boolean;

  marginfiClient: MarginfiClient;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedActionType: ActionType;
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
  requestedActionType,
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
    actionMode,
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
    state.actionMode,
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
    actionMode,
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
      refreshState(actionMode);
    }
  }, [refreshState, connected, actionMode]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedAction: requestedActionType, requestedBank });
  }, [requestedBank, fetchActionBoxState, requestedActionType]);

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
        actionMode,
        actionQuote,
      }),
    [amount, connected, selectedBank, selectedSecondaryBank, actionMode, actionQuote]
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
        setSelectedSecondaryBank={setSelectedSecondaryBank}
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
