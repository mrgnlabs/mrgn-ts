import React, { useEffect } from "react";

import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

import { WSOL_MINT, nativeToUi } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo, ExtendedBankInfo, ActionType, TokenAccountMap } from "@mrgnlabs/marginfi-v2-ui-state";

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
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { useLendBoxStore } from "./store";
import { checkActionAvailable, handleExecuteCloseBalance, handleExecuteLendingAction } from "./utils";
import { ActionBoxWrapper, ActionMessage, ActionProgressBar, ActionSettingsButton } from "../../sharedComponents";
import { LendBoxInput } from "./components";
import { PreviousTxn } from "~/types";
import { useLendAmounts } from "./hooks";

// error handling
export type LendBoxProps = {
  nativeSolBalance: number;
  tokenAccountMap: TokenAccountMap;

  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedLendType: ActionType;
  requestedBank?: ExtendedBankInfo;

  isDialog?: boolean;

  onComplete: (previousTxn: PreviousTxn) => void;
  captureEvent?: (event: string, properties?: Record<string, any>) => void;
};

export const LendBox = ({
  nativeSolBalance,
  tokenAccountMap,
  banks,
  selectedAccount,
  requestedLendType,
  requestedBank,
  isDialog,
  onComplete,
  captureEvent,
}: LendBoxProps) => {
  const priorityFee = 0;

  const [
    amountRaw,
    lendMode,
    selectedBank,
    isLoading,
    errorMessage,

    refreshState,
    fetchActionBoxState,
    setLendMode,
    setIsLoading,
    setAmountRaw,
    refreshSelectedBanks,
  ] = useLendBoxStore((state) => [
    state.amountRaw,
    state.lendMode,
    state.selectedBank,
    state.isLoading,
    state.errorMessage,

    state.refreshState,
    state.fetchActionBoxState,
    state.setLendMode,
    state.setIsLoading,
    state.setAmountRaw,
    state.refreshSelectedBanks,
  ]);

  const { amount, walletAmount, maxAmount } = useLendAmounts({
    amountRaw,
    selectedBank,
    nativeSolBalance,
    lendMode,
  });

  const { walletContextState, connected } = useWalletContext();

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState(lendMode);
    }
  }, [refreshState, connected, lendMode]);

  // Toggle between main action view and settings view
  const [isSettingsActive, setIsSettingsActive] = React.useState<boolean>(false);

  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

  const [additionalActionMethods, setAdditionalActionMethods] = React.useState<ActionMethod[]>([]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedLendType, requestedBank });
  }, [requestedLendType, requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    if (errorMessage !== null && errorMessage.description) {
      showErrorToast(errorMessage?.description);
      setAdditionalActionMethods([errorMessage]);
    }
  }, [errorMessage]);

  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(
    () => (lendMode === ActionType.Withdraw && isDust) || false,
    [lendMode, isDust]
  );

  const actionMethods = React.useMemo(
    () =>
      checkActionAvailable({
        amount,
        connected,
        showCloseBalance,
        selectedBank,
        banks,
        marginfiAccount: selectedAccount,
        nativeSolBalance,
        lendMode,
      }),
    [amount, connected, showCloseBalance, selectedBank, banks, selectedAccount, nativeSolBalance, lendMode]
  );

  const handleCloseBalance = React.useCallback(async () => {
    if (!selectedBank || !selectedAccount) {
      return;
    }

    await handleExecuteCloseBalance({
      params: {
        bank: selectedBank,
        marginfiAccount: selectedAccount,
        priorityFee,
      },
      captureEvent: (event, properties) => {
        captureEvent && captureEvent(event, properties);
      },
      setIsComplete: (txnSigs) => {
        onComplete({
          type: ActionType.Withdraw,
          bank: selectedBank as ActiveBankInfo,
          amount: 0,
          txn: txnSigs.pop() ?? "",
        });
      },
      setIsError: () => {},
      setIsLoading: (isLoading) => setIsLoading(isLoading),
    });

    setAmountRaw("");
  }, [selectedBank, selectedAccount, priorityFee, setIsLoading, setAmountRaw]);

  const handleLendingAction = React.useCallback(async () => {
    if (!selectedBank || !amount) {
      return;
    }

    const action = async () => {
      const params = {
        mfiClient: null,
        actionType: lendMode,
        bank: selectedBank,
        amount,
        nativeSolBalance,
        marginfiAccount: selectedAccount,
        walletContextState,
      } as MarginfiActionParams;

      handleExecuteLendingAction({
        params,
        captureEvent: (event, properties) => {
          captureEvent && captureEvent(event, properties);
        },
        setIsComplete: (txnSigs) => {
          onComplete({
            type: lendMode,
            bank: selectedBank as ActiveBankInfo,
            amount: amount,
            txn: txnSigs.pop() ?? "",
          });
        },
        setIsError: () => {},
        setIsLoading: (isLoading) => setIsLoading(isLoading),
      });
    };

    if (
      lendMode === ActionType.Deposit &&
      (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL")
    ) {
      setLSTDialogCallback(() => action);
      return;
    }

    await action();
    setAmountRaw("");
  }, [lendMode, selectedBank, amount, nativeSolBalance, selectedAccount, walletContextState]);

  return (
    <ActionBoxWrapper
      actionMode={lendMode as any}
      settings={{ value: isSettingsActive, setShowSettings: setIsSettingsActive }}
    >
      <LendBoxInput
        banks={banks}
        nativeSolBalance={nativeSolBalance}
        walletAmount={walletAmount}
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

      <ActionProgressBar
        amount={0}
        ratio={0}
        label={"Available Collateral"}
        TooltipValue={
          <div className="space-y-2">
            <p>Available collateral is the USD value of your collateral not actively backing a loan.</p>
            <p>It can be used to open additional borrows or withdraw part of your collateral.</p>
          </div>
        }
      />

      <ActionSettingsButton setIsSettingsActive={setIsSettingsActive} />

      <ActionBoxActions
        isLoading={isLoading}
        isEnabled={false}
        actionMode={lendMode}
        showCloseBalance={
          !additionalActionMethods.concat(actionMethods).filter((value) => value.isEnabled === false).length
        }
        handleAction={() => {
          showCloseBalance ? handleCloseBalance() : handleLendingAction();
        }}
      />

      <LSTDialog
        variant={selectedBank?.meta.tokenSymbol as LSTDialogVariants}
        open={!!lstDialogCallback}
        onClose={() => {
          if (lstDialogCallback) {
            lstDialogCallback();
            setLSTDialogCallback(null);
          }
        }}
      />
    </ActionBoxWrapper>
  );
};
