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
import { checkActionAvailable } from "./utils";
import { ActionBoxWrapper, ActionMessage } from "../../sharedComponents";

export type LendBoxProps = {
  nativeSolBalance: number;
  tokenAccountMap: TokenAccountMap;
  selectedAccount: MarginfiAccountWrapper | null;
  banks: ExtendedBankInfo[];
  requestedLendType: ActionType;
  isDialog?: boolean;
  requestedBank?: ExtendedBankInfo;
  onComplete: () => void;
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

  const [setIsActionComplete, setPreviousTxn] = useUiStore((state) => [
    state.setIsActionComplete,
    state.setPreviousTxn,
  ]);

  const { walletContextState, connected, wallet } = useWalletContext();
  const { connection } = useConnection();

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState(lendMode);
    }
  }, [refreshState, connected, lendMode]);

  // Toggle between main action view and settings view
  const [isSettingsActive, setIsSettingsActive] = React.useState<boolean>(false);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [hasLSTDialogShown, setHasLSTDialogShown] = React.useState<LSTDialogVariants[]>([]);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);
  const [additionalActionMethods, setAdditionalActionMethods] = React.useState<ActionMethod[]>([]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedLendType, requestedBank });
  }, [requestedLendType, requestedBank, fetchActionBoxState]);

  //   React.useEffect(() => {
  //     refreshSelectedBanks(extendedBankInfos);
  //   }, [extendedBankInfos, refreshSelectedBanks]);

  React.useEffect(() => {
    if (errorMessage !== null && errorMessage.description) {
      showErrorToast(errorMessage?.description);
      setAdditionalActionMethods([errorMessage]);
    }
  }, [errorMessage]);

  // Amount related useMemo's
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const walletAmount = React.useMemo(
    () =>
      selectedBank?.info.state.mint?.equals && selectedBank?.info.state.mint?.equals(WSOL_MINT)
        ? selectedBank?.userInfo.tokenAccount.balance + nativeSolBalance
        : selectedBank?.userInfo.tokenAccount.balance,
    [nativeSolBalance, selectedBank]
  );

  const maxAmount = React.useMemo(() => {
    if (!selectedBank) {
      return 0;
    }

    switch (lendMode) {
      case ActionType.Deposit:
        return selectedBank?.userInfo.maxDeposit ?? 0;
      case ActionType.Withdraw:
        return selectedBank?.userInfo.maxWithdraw ?? 0;
      case ActionType.Borrow:
        return selectedBank?.userInfo.maxBorrow ?? 0;
      case ActionType.Repay:
        return selectedBank?.userInfo.maxRepay ?? 0;
      default:
        return 0;
    }
  }, [selectedBank, lendMode]);

  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(() => lendMode === ActionType.Withdraw && isDust, [lendMode, isDust]);

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

  const executeLendingActionCb = React.useCallback(
    async ({
      mfiClient,
      actionType: currentAction,
      bank,
      amount: borrowOrLendAmount,
      nativeSolBalance,
      marginfiAccount,
      walletContextState,
      repayWithCollatOptions,
    }: MarginfiActionParams) => {
      setIsLoading(true);
      const attemptUuid = uuidv4();
      capture(`user_${currentAction.toLowerCase()}_initiate`, {
        uuid: attemptUuid,
        tokenSymbol: bank.meta.tokenSymbol,
        tokenName: bank.meta.tokenName,
        amount: borrowOrLendAmount,
        priorityFee,
      });
      // idea execute in parent
      const txnSig = await executeLendingAction({
        mfiClient,
        actionType: currentAction,
        bank,
        amount: borrowOrLendAmount,
        nativeSolBalance,
        marginfiAccount,
        walletContextState,
        priorityFee,
        repayWithCollatOptions,
      });

      setIsLoading(false);
      //   handleCloseDialog && handleCloseDialog();
      setAmountRaw("");

      if (txnSig) {
        setIsActionComplete(true);
        setPreviousTxn({
          type: currentAction,
          bank: bank as ActiveBankInfo,
          amount: borrowOrLendAmount,
          txn: Array.isArray(txnSig) ? txnSig.pop() ?? "" : txnSig!,
        });
        capture(`user_${currentAction.toLowerCase()}`, {
          uuid: attemptUuid,
          tokenSymbol: bank.meta.tokenSymbol,
          tokenName: bank.meta.tokenName,
          amount: borrowOrLendAmount,
          txn: txnSig!,
          priorityFee,
        });

        // onComplete && onComplete();
      } else {
        // onError && onError();
      }

      // -------- Refresh state
      try {
        // second case to execute in parent
        // setIsRefreshingStore(true);
        // await fetchMrgnlendState();
      } catch (error: any) {
        console.log("Error while reloading state");
        console.log(error);
      }
    },
    [setIsLoading, priorityFee, setAmountRaw, setIsActionComplete, setPreviousTxn]
  );

  const handleCloseBalance = React.useCallback(async () => {
    if (!selectedBank || !selectedAccount) {
      return;
    }
    setIsLoading(true);
    const attemptUuid = uuidv4();
    capture(`user_close_balance_initiate`, {
      uuid: attemptUuid,
      tokenSymbol: selectedBank.meta.tokenSymbol,
      tokenName: selectedBank.meta.tokenName,
      amount: 0,
      priorityFee,
    });

    const txnSig = await closeBalance({ marginfiAccount: selectedAccount, bank: selectedBank, priorityFee });
    setIsLoading(false);
    if (txnSig) {
      setPreviousTxn({
        type: ActionType.Withdraw,
        bank: selectedBank as ActiveBankInfo,
        amount: 0,
        txn: txnSig!,
      });
      capture(`user_close_balance`, {
        uuid: attemptUuid,
        tokenSymbol: selectedBank.meta.tokenSymbol,
        tokenName: selectedBank.meta.tokenName,
        amount: 0,
        txn: txnSig!,
        priorityFee,
      });
    }

    setAmountRaw("");
    // handleCloseDialog && handleCloseDialog();

    try {
      //   setIsRefreshingStore(true);
      //   await fetchMrgnlendState();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [selectedBank, selectedAccount, priorityFee, setIsLoading, setAmountRaw, setPreviousTxn]);

  const handleAction = async () => {
    await handleLendingAction();
  };

  const handleLendingAction = React.useCallback(async () => {
    if (!lendMode || !selectedBank || !amount) {
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

      executeLendingActionCb(params);
    };

    if (
      lendMode === ActionType.Deposit &&
      (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL") &&
      !hasLSTDialogShown.includes(selectedBank.meta.tokenSymbol as LSTDialogVariants)
    ) {
      setHasLSTDialogShown((prev) => [...prev, selectedBank.meta.tokenSymbol as LSTDialogVariants]);
      setLSTDialogVariant(selectedBank.meta.tokenSymbol as LSTDialogVariants);
      setIsLSTDialogOpen(true);
      setLSTDialogCallback(() => action);

      return;
    }

    await action();

    if (
      lendMode === ActionType.Withdraw &&
      (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL") &&
      !hasLSTDialogShown.includes(selectedBank.meta.tokenSymbol as LSTDialogVariants)
    ) {
      setHasLSTDialogShown((prev) => [...prev, selectedBank.meta.tokenSymbol as LSTDialogVariants]);
      setLSTDialogVariant(selectedBank.meta.tokenSymbol as LSTDialogVariants);
      return;
    }
  }, [
    lendMode,
    selectedBank,
    amount,
    hasLSTDialogShown,
    nativeSolBalance,
    selectedAccount,
    walletContextState,
    executeLendingActionCb,
  ]);

  return (
    <ActionBoxWrapper
      actionMode={lendMode as any}
      settings={{ value: isSettingsActive, setShowSettings: setIsSettingsActive }}
    >
      <>
        {additionalActionMethods.concat(actionMethods).map(
          (actionMethod, idx) =>
            actionMethod.description && (
              <div className="pb-6" key={idx}>
                <ActionMessage actionMethod={actionMethod} />
              </div>
            )
        )}

        <div className="flex justify-between mt-3">
          <div className="flex justify-end gap-2 ml-auto">
            <button
              onClick={() => setIsSettingsActive(true)}
              className="text-xs gap-1 h-6 px-2 flex items-center rounded-full border border-background-gray-light bg-transparent hover:bg-background-gray-light text-muted-foreground"
            >
              Settings <IconSettings size={16} />
            </button>
          </div>
        </div>
      </>

      <LSTDialog
        variant={lstDialogVariant}
        open={isLSTDialogOpen}
        onClose={() => {
          setIsLSTDialogOpen(false);
          setLSTDialogVariant(null);
          if (lstDialogCallback) {
            lstDialogCallback();
            setLSTDialogCallback(null);
          }
        }}
      />
    </ActionBoxWrapper>
  );
};
