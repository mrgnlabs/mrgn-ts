import React from "react";

import { ExtendedBankInfo, ActionType, TokenAccountMap, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";

import { useWalletContext } from "~/hooks/useWalletContext";

import { showErrorToast } from "~/utils/toastUtils";

import { ActionBoxActions } from "~/components/common/ActionBox/components";
import { ActionMethod } from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

import { ActionMessage, ActionSettingsButton } from "../../sharedComponents";

import { PreviousTxn } from "~/types";

import { useActionBoxStore } from "../../store";
import { useActionAmounts } from "../../sharedHooks";
import { useRepayCollatBoxStore } from "./store";
import { useRepayCollatSimulation } from "./hooks";
import { checkActionAvailable } from "./utils";
import { RepayCollatBoxCollateral, RepayCollatBoxInput, RepayCollatBoxPreview } from "./components";

// error handling
export type RepayCollatBoxProps = {
  nativeSolBalance: number;
  // tokenAccountMap: TokenAccountMap;

  marginfiClient: MarginfiClient;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedActionType: ActionType;
  requestedBank?: ExtendedBankInfo;
  accountSummary?: AccountSummary;

  isDialog?: boolean;

  onComplete: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const RepayCollatBox = ({
  nativeSolBalance,
  // tokenAccountMap,
  banks,
  marginfiClient,
  selectedAccount,
  accountSummary,
  requestedActionType,
  requestedBank,
  isDialog,
  onComplete,
  captureEvent,
}: RepayCollatBoxProps) => {
  const priorityFee = 0;

  const [
    maxAmountCollateral,
    actionMode,
    amountRaw,
    actionQuote,
    selectedBank,
    selectedSecondaryBank,
    errorMessage,
    isLoading,
    refreshState,

    fetchActionBoxState,
  ] = useRepayCollatBoxStore((state) => [
    state.maxAmountCollateral,
    state.actionMode,
    state.amountRaw,
    state.actionQuote,
    state.selectedBank,
    state.selectedSecondaryBank,
    state.errorMessage,
    state.isLoading,
    state.refreshState,
    state.fetchActionBoxState,
  ]);

  const [setIsSettingsDialogOpen] = useActionBoxStore((state) => [state.setIsSettingsDialogOpen]);

  const { amount, debouncedAmount, walletAmount, maxAmount } = useActionAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    actionMode,
    maxAmountCollateral,
  });

  const { actionSummary } = useRepayCollatSimulation(
    debouncedAmount ?? 0,
    selectedAccount,
    marginfiClient,
    accountSummary
  );

  const { walletContextState, connected } = useWalletContext();

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
      <RepayCollatBoxInput
        banks={banks}
        nativeSolBalance={nativeSolBalance}
        amountRaw={amountRaw}
        maxAmount={maxAmount}
      />

      {additionalActionMethods.concat(actionMethods).map(
        (actionMethod, idx) =>
          actionMethod.description && (
            <div className="pb-6" key={idx}>
              <ActionMessage actionMethod={actionMethod} />
            </div>
          )
      )}

      <RepayCollatBoxCollateral selectedAccount={selectedAccount} actionSummary={actionSummary} />

      <ActionBoxActions
        isLoading={isLoading}
        isEnabled={!additionalActionMethods.concat(actionMethods).filter((value) => value.isEnabled === false).length}
        actionMode={actionMode}
        showCloseBalance={false}
        handleAction={() => {
          handleRepayCollatAction();
        }}
      />

      <ActionSettingsButton setIsSettingsActive={setIsSettingsDialogOpen} />

      <RepayCollatBoxPreview actionSummary={actionSummary} />
    </>
  );
};
