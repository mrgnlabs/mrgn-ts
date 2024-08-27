import React, { useEffect } from "react";

import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

import { WSOL_MINT, nativeToUi } from "@mrgnlabs/mrgn-common";
import {
  ActiveBankInfo,
  ExtendedBankInfo,
  ActionType,
  TokenAccountMap,
  AccountSummary,
} from "@mrgnlabs/marginfi-v2-ui-state";

import { useUiStore } from "~/store";
import {
  closeBalance,
  executeLendingAction,
  cn,
  capture,
  executeLstAction,
  getBlockedActions,
  executeLoopingAction,
  createAccountAction,
} from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { SOL_MINT } from "~/store/lstStore";

import { LSTDialog, LSTDialogVariants } from "~/components/common/AssetList";
import { IconAlertTriangle, IconExternalLink, IconSettings } from "~/components/ui/icons";
import { showErrorToast } from "~/utils/toastUtils";

import {
  ActionBoxPreview,
  ActionBoxSettings,
  ActionBoxActions,
  ActionBoxInput,
} from "~/components/common/ActionBox/components";
import { Button } from "~/components/ui/button";
import { ActionMethod, MarginfiActionParams, RepayType } from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";

import { ActionBoxWrapper, ActionMessage, ActionProgressBar, ActionSettingsButton } from "../../sharedComponents";

import { PreviousTxn } from "~/types";

import { useActionBoxStore } from "../../store";
import { useActionAmounts } from "../../sharedHooks";
import { useFlashLoanBoxStore } from "./store";
import { useFlashLoanSimulation } from "./hooks";
import { checkActionAvailable } from "./utils";

// error handling
export type FlashLoanBoxProps = {
  nativeSolBalance: number;
  tokenAccountMap: TokenAccountMap;

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

export const FlashLoanBox = ({
  nativeSolBalance,
  tokenAccountMap,
  banks,
  marginfiClient,
  selectedAccount,
  accountSummary,
  requestedActionType,
  requestedBank,
  isDialog,
  onComplete,
  captureEvent,
}: FlashLoanBoxProps) => {
  const priorityFee = 0;

  const [
    maxAmountCollateral,
    actionMode,
    amountRaw,
    actionQuote,
    selectedBank,
    selectedSecondaryBank,
    errorMessage,
    refreshState,
    fetchActionBoxState,
  ] = useFlashLoanBoxStore((state) => [
    state.maxAmountCollateral,
    state.actionMode,
    state.amountRaw,
    state.actionQuote,
    state.selectedBank,
    state.selectedSecondaryBank,
    state.errorMessage,
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

  const { actionSummary } = useFlashLoanSimulation(
    debouncedAmount ?? 0,
    selectedAccount,
    marginfiClient,
    accountSummary
  );

  const { walletContextState, connected } = useWalletContext();

  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);
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

  // const handleLendingAction = React.useCallback(async () => {
  //   if (!selectedBank || !amount) {
  //     return;
  //   }

  //   const action = async () => {
  //     const params = {
  //       mfiClient: null,
  //       actionType: lendMode,
  //       bank: selectedBank,
  //       amount,
  //       nativeSolBalance,
  //       marginfiAccount: selectedAccount,
  //       walletContextState,
  //     } as MarginfiActionParams;

  //     await handleExecuteLendingAction({
  //       params,
  //       captureEvent: (event, properties) => {
  //         captureEvent && captureEvent(event, properties);
  //       },
  //       setIsComplete: (txnSigs) => {
  //         onComplete({
  //           type: lendMode,
  //           bank: selectedBank as ActiveBankInfo,
  //           amount: amount,
  //           txn: txnSigs.pop() ?? "",
  //         });
  //       },
  //       setIsError: () => {},
  //       setIsLoading: (isLoading) => setIsLoading(isLoading),
  //     });
  //   };

  //   if (
  //     lendMode === ActionType.Deposit &&
  //     (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL")
  //   ) {
  //     setLSTDialogCallback(() => action);
  //     return;
  //   }

  //   await action();
  //   setAmountRaw("");
  // }, [lendMode, selectedBank, amount, nativeSolBalance, selectedAccount, walletContextState]);

  return <></>;
};
