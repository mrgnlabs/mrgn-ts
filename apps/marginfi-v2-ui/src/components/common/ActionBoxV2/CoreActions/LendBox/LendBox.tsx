import React, { useEffect } from "react";

import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

import { WSOL_MINT, nativeToUi } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo, ExtendedBankInfo, TokenAccountMap } from "@mrgnlabs/marginfi-v2-ui-state";

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

type ActionBoxProps = {
  nativeSolBalance: number;
  tokenAccountMap: TokenAccountMap;
  selectedAccount: MarginfiAccountWrapper | null;
  extendedBankInfos: ExtendedBankInfo[];
  requestedAction?: ActionType;
  requestedBank?: ExtendedBankInfo;
};

export const LendBox = ({
  nativeSolBalance,
  tokenAccountMap,
  extendedBankInfos,
  selectedAccount,
  requestedAction,
  requestedBank,
}: ActionBoxProps) => {
  const [
    amountRaw,
    actionMode,
    selectedBank,
    isLoading,
    errorMessage,

    refreshState,
    fetchActionBoxState,
    setActionMode,
    setIsLoading,
    setAmountRaw,
    refreshSelectedBanks,
  ] = useLendBoxStore((state) => [
    state.amountRaw,
    state.actionMode,
    state.selectedBank,
    state.isLoading,
    state.errorMessage,

    state.refreshState,
    state.fetchActionBoxState,
    state.setActionMode,
    state.setIsLoading,
    state.setAmountRaw,
    state.refreshSelectedBanks,
  ]);

  const [priorityFee, setPriorityFee, setIsActionComplete, setPreviousTxn] = useUiStore((state) => [
    state.priorityFee,
    state.setPriorityFee,
    state.setIsActionComplete,
    state.setPreviousTxn,
  ]);

  const { walletContextState, connected, wallet } = useWalletContext();
  const { connection } = useConnection();

  // Cleanup the store when the wallet disconnects
  React.useEffect(() => {
    if (!connected) {
      refreshState(actionMode);
    }
  }, [refreshState, connected, actionMode]);

  const [isSettingsMode, setIsSettingsMode] = React.useState<boolean>(false);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [hasLSTDialogShown, setHasLSTDialogShown] = React.useState<LSTDialogVariants[]>([]);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);
  const [additionalActionMethods, setAdditionalActionMethods] = React.useState<ActionMethod[]>([]);

  React.useEffect(() => {
    fetchActionBoxState({ requestedAction, requestedBank });
  }, [requestedAction, requestedBank, fetchActionBoxState]);

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

    switch (actionMode) {
      case ActionType.Deposit:
        return selectedBank?.userInfo.maxDeposit ?? 0;
      case ActionType.Loop:
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
  }, [selectedBank, actionMode]);

  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(() => actionMode === ActionType.Withdraw && isDust, [actionMode, isDust]);

  const actionMethods = React.useMemo(
    () =>
      checkActionAvailable({
        amount,
        connected,
        showCloseBalance,
        selectedBank,
        extendedBankInfos,
        marginfiAccount: selectedAccount,
        nativeSolBalance,
        actionMode,
      }),
    [
      amount,
      connected,
      showCloseBalance,
      selectedBank,
      extendedBankInfos,
      selectedAccount,
      nativeSolBalance,
      actionMode,
    ]
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
    if (!actionMode || !selectedBank || !amount) {
      return;
    }

    const action = async () => {
      const params = {
        mfiClient: null,
        actionType: actionMode,
        bank: selectedBank,
        amount,
        nativeSolBalance,
        marginfiAccount: selectedAccount,
        walletContextState,
      } as MarginfiActionParams;

      executeLendingActionCb(params);
    };

    if (
      actionMode === ActionType.Deposit &&
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
      actionMode === ActionType.Withdraw &&
      (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL") &&
      !hasLSTDialogShown.includes(selectedBank.meta.tokenSymbol as LSTDialogVariants)
    ) {
      setHasLSTDialogShown((prev) => [...prev, selectedBank.meta.tokenSymbol as LSTDialogVariants]);
      setLSTDialogVariant(selectedBank.meta.tokenSymbol as LSTDialogVariants);
      return;
    }
  }, [
    actionMode,
    selectedBank,
    amount,
    hasLSTDialogShown,
    nativeSolBalance,
    selectedAccount,
    walletContextState,
    executeLendingActionCb,
  ]);

  return (
    <>
      <>
        <ActionBoxInput
          isMini={isMini}
          walletAmount={walletAmount}
          amountRaw={amountRaw}
          maxAmount={maxAmount}
          showCloseBalance={showCloseBalance}
          isDialog={isDialog}
        />

        {additionalActionMethods.concat(actionMethods).map(
          (actionMethod, idx) =>
            actionMethod.description && (
              <div className="pb-6" key={idx}>
                <div
                  className={cn(
                    "flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm",
                    actionMethod.actionMethod === "INFO" && "bg-info text-info-foreground",
                    (!actionMethod.actionMethod || actionMethod.actionMethod === "WARNING") &&
                      "bg-alert text-alert-foreground",
                    actionMethod.actionMethod === "ERROR" && "bg-[#990000] text-primary"
                  )}
                >
                  <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
                  <div className="space-y-2.5">
                    <p>{actionMethod.description}</p>
                    {actionMethod.link && (
                      <p>
                        {/* <span className="hidden md:inline">-</span>{" "} */}
                        <Link
                          href={actionMethod.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border-b border-warning/50 hover:border-transparent transition-colors"
                        >
                          <IconExternalLink size={14} className="inline -translate-y-[1px]" />{" "}
                          {actionMethod.linkText || "Read more"}
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
        )}

        <ActionBoxPreview
          selectedBank={selectedBank}
          selectedStakingAccount={selectedStakingAccount}
          actionMode={actionMode}
          amount={amount}
          slippageBps={slippageBps}
          isEnabled={!isMini}
          loopOptions={
            actionQuote && loopingAmounts && selectedRepayBank
              ? {
                  loopingQuote: actionQuote,
                  loopingBank: selectedRepayBank,
                  loopingTxn: actionTxns.actionTxn,
                  bundleTipTxn: actionTxns.bundleTipTxn,
                  borrowAmount: loopingAmounts?.borrowAmount,
                  connection,
                }
              : undefined
          }
          repayWithCollatOptions={
            actionQuote && repayAmount && selectedRepayBank
              ? {
                  repayCollatQuote: actionQuote,
                  repayCollatTxn: actionTxns.actionTxn,
                  bundleTipTxn: actionTxns.bundleTipTxn,
                  withdrawAmount: repayAmount,
                  depositBank: selectedRepayBank,
                  connection,
                }
              : undefined
          }
          addAdditionalsPopup={(actions) => setAdditionalActionMethods(actions)}
        >
          <ActionBoxActions
            handleAction={() => {
              showCloseBalance ? handleCloseBalance() : handleAction();
            }}
            isLoading={isLoading}
            showCloseBalance={showCloseBalance ?? false}
            isEnabled={
              !additionalActionMethods.concat(actionMethods).filter((value) => value.isEnabled === false).length
            }
            actionMode={actionMode}
          />
          <div className="flex justify-between mt-3">
            {/* {isPreviewVisible ? (
                    <button
                      className={cn(
                        "flex text-muted-foreground text-xs items-center cursor-pointer transition hover:text-primary cursor-pointer"
                      )}
                      onClick={() => setHasPreviewShown(!hasPreviewShown)}
                    >
                      {hasPreviewShown ? (
                        <>
                          <IconEyeClosed size={14} /> <span className="mx-1">Hide details</span>
                        </>
                      ) : (
                        <>
                          <IconEye size={14} /> <span className="mx-1">View details</span>
                        </>
                      )}
                      <IconChevronDown className={cn(hasPreviewShown && "rotate-180")} size={16} />
                    </button>
                  ) : (
                    <div />
                  )} */}

            <div className="flex justify-end gap-2 ml-auto">
              <button
                onClick={() => setIsSettingsMode(true)}
                className="text-xs gap-1 h-6 px-2 flex items-center rounded-full border border-background-gray-light bg-transparent hover:bg-background-gray-light text-muted-foreground"
              >
                Settings <IconSettings size={16} />
              </button>
            </div>
          </div>
        </ActionBoxPreview>
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
    </>
  );
};
