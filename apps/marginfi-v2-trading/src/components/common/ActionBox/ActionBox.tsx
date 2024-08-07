import React from "react";

import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

import { WSOL_MINT, nativeToUi } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { useLstStore, useUiStore, useTradeStore } from "~/store";
import {
  MarginfiActionParams,
  closeBalance,
  executeLendingAction,
  cn,
  capture,
  executeLstAction,
  getBlockedActions,
} from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { useActionBoxStore } from "~/hooks/useActionBoxStore";
import { SOL_MINT } from "~/store/lstStore";

import { ActionMethod, checkActionAvailable, RepayType } from "~/utils/actionBoxUtils";
import { IconAlertTriangle, IconExternalLink, IconSettings } from "~/components/ui/icons";
import { showErrorToast } from "~/utils/toastUtils";

import {
  ActionBoxPreview,
  ActionBoxSettings,
  ActionBoxActions,
  ActionBoxInput,
} from "~/components/common/ActionBox/components";
import { GroupData } from "~/store/tradeStore";

type ActionBoxProps = {
  requestedAction?: ActionType;
  requestedBank?: ExtendedBankInfo;
  requestedCollateralBank?: ExtendedBankInfo;
  requestedAccount?: MarginfiAccountWrapper;
  isDialog?: boolean;
  activeGroupArg?: GroupData | null;
  isTokenSelectable?: boolean;
  handleCloseDialog?: () => void;
};

type BlackListRoutesMap = {
  [tokenIdentifier: string]: {
    blacklistRoutes: string[];
  };
};

export const ActionBox = ({
  requestedAction,
  requestedBank,
  requestedAccount,
  requestedCollateralBank,
  isDialog,
  activeGroupArg,
  isTokenSelectable,
  handleCloseDialog,
}: ActionBoxProps) => {
  const [
    isInitialized,
    setIsRefreshingStore,
    activeGroupPk,
    groupMap,
    mfiClient,
    marginfiAccounts,
    nativeSolBalance,
    fetchTradeState,
    setActiveGroup,
  ] = useTradeStore((state) => [
    state.initialized,
    state.setIsRefreshingStore,
    state.activeGroup,
    state.groupMap,
    state.marginfiClient,
    state.marginfiAccounts,
    state.nativeSolBalance,
    state.fetchTradeState,
    state.setActiveGroup,
  ]);

  const activeAccount = React.useMemo(() => {
    if (marginfiAccounts) {
      return marginfiAccounts[activeGroupPk?.toBase58() ?? ""] ?? null;
    }
    return null;
  }, [marginfiAccounts, activeGroupPk]);

  const activeGroup = React.useMemo(() => {
    const group = activeGroupPk ? groupMap.get(activeGroupPk.toBase58()) || null : null;
    return activeGroupArg ?? group;
  }, [activeGroupArg, activeGroupPk, groupMap]);

  const [
    slippageBps,
    amountRaw,
    repayAmountRaw,
    maxAmountCollat,
    actionMode,
    repayMode,
    selectedBank,
    selectedRepayBank,
    selectedStakingAccount,
    repayCollatQuote,
    repayCollatTxns,
    isLoading,
    errorMessage,

    refreshState,
    fetchActionBoxState,
    setSlippageBps,
    setActionMode,
    setIsLoading,
    setAmountRaw,
    refreshSelectedBanks,
  ] = useActionBoxStore(isDialog)((state) => [
    state.slippageBps,
    state.amountRaw,
    state.repayAmountRaw,
    state.maxAmountCollat,
    state.actionMode,
    state.repayMode,
    state.selectedBank,
    state.selectedRepayBank,
    state.selectedStakingAccount,
    state.repayCollatQuote,
    state.repayCollatTxns,
    state.isLoading,
    state.errorMessage,

    state.refreshState,
    state.fetchActionBoxState,
    state.setSlippageBps,
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
  const [lstData, lstQuoteMeta, feesAndRent] = useLstStore((state) => [
    state.lstData,
    state.quoteResponseMeta,
    state.feesAndRent,
  ]);

  const { walletContextState, connected, wallet } = useWalletContext();
  const { connection } = useConnection();

  // Cleanup the store when the component unmounts or wallet disconnects
  React.useEffect(() => {
    return () => refreshState();
  }, [refreshState, connected]);

  const [isSettingsMode, setIsSettingsMode] = React.useState<boolean>(false);
  const [additionalActionMethods, setAdditionalActionMethods] = React.useState<ActionMethod[]>([]);

  const selectedAccount = React.useMemo(() => {
    if (requestedAccount) {
      return requestedAccount;
    } else if (activeAccount) {
      return activeAccount;
    } else {
      return null;
    }
  }, [requestedAccount, activeAccount]);

  const extendedBankInfos = React.useMemo(() => {
    console.log({ activeGroup });
    return activeGroup ? [activeGroup.pool.token, ...activeGroup.pool.quoteTokens] : [];
  }, [activeGroup]);

  React.useEffect(() => {
    if (!selectedBank) {
      fetchActionBoxState({ requestedAction, requestedBank });
    }
  }, [requestedAction, selectedBank, requestedBank, fetchActionBoxState]);

  React.useEffect(() => {
    refreshSelectedBanks(extendedBankInfos);
  }, [extendedBankInfos, refreshSelectedBanks]);

  React.useEffect(() => {
    if (errorMessage !== null && errorMessage.description) {
      showErrorToast(errorMessage?.description);
      setAdditionalActionMethods([errorMessage]);
    }
  }, [errorMessage]);

  // Either a staking account is selected or a bank
  const isActionDisabled = React.useMemo(() => {
    const blockedActions = getBlockedActions();

    if (blockedActions?.find((value) => value === actionMode)) return true;

    return false;
  }, [actionMode]);

  // Amount related useMemo's
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const repayAmount = React.useMemo(() => {
    const strippedAmount = repayAmountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [repayAmountRaw]);

  const walletAmount = React.useMemo(
    () =>
      selectedBank?.info.state.mint?.equals && selectedBank?.info.state.mint?.equals(WSOL_MINT)
        ? selectedBank?.userInfo.tokenAccount.balance + nativeSolBalance
        : selectedBank?.userInfo.tokenAccount.balance,
    [nativeSolBalance, selectedBank]
  );

  const maxAmount = React.useMemo(() => {
    if ((!selectedBank && !selectedStakingAccount) || !isInitialized) {
      return 0;
    }

    switch (actionMode) {
      case ActionType.Deposit:
        return selectedBank?.userInfo.maxDeposit ?? 0;
      case ActionType.Withdraw:
        return selectedBank?.userInfo.maxWithdraw ?? 0;
      case ActionType.Borrow:
        return selectedBank?.userInfo.maxBorrow ?? 0;
      case ActionType.Repay:
        if (repayMode === RepayType.RepayCollat && selectedBank?.isActive) return maxAmountCollat ?? 0;
        return selectedBank?.userInfo.maxRepay ?? 0;
      case ActionType.MintLST:
        if (selectedStakingAccount) return nativeToUi(selectedStakingAccount.lamports, 9);
        if (selectedBank?.info.state.mint.equals(SOL_MINT))
          return walletAmount ? Math.max(0, walletAmount - nativeToUi(feesAndRent, 9)) : 0;
        else return walletAmount ?? 0;
      case ActionType.UnstakeLST:
        return walletAmount ?? 0;
      default:
        return 0;
    }
  }, [
    selectedBank,
    selectedStakingAccount,
    actionMode,
    isInitialized,
    walletAmount,
    feesAndRent,
    maxAmountCollat,
    repayMode,
  ]);

  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(() => actionMode === ActionType.Withdraw && isDust, [actionMode, isDust]);
  // const isPreviewVisible = React.useMemo(
  //   () => actionMode === ActionType.MintLST || !!selectedBank,
  //   [actionMode, selectedBank]
  // );

  const actionMethods = React.useMemo(
    () =>
      checkActionAvailable({
        amount,
        repayAmount,
        connected,
        showCloseBalance,
        selectedBank,
        selectedRepayBank,
        selectedStakingAccount,
        extendedBankInfos,
        marginfiAccount: selectedAccount,
        nativeSolBalance,
        actionMode,
        blacklistRoutes: null,
        repayMode,
        repayCollatQuote: repayCollatQuote ?? null,
        lstQuoteMeta: lstQuoteMeta,
      }),
    [
      amount,
      repayAmount,
      connected,
      showCloseBalance,
      selectedBank,
      selectedRepayBank,
      selectedStakingAccount,
      extendedBankInfos,
      selectedAccount,
      nativeSolBalance,
      actionMode,
      repayMode,
      repayCollatQuote,
      lstQuoteMeta,
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
      handleCloseDialog && handleCloseDialog();
      setAmountRaw("");

      if (txnSig) {
        setIsActionComplete(true);
        setPreviousTxn({
          txnType: "LEND",
          txn: Array.isArray(txnSig) ? txnSig.pop() ?? "" : txnSig!,
          lendingOptions: {
            type: currentAction,
            bank: bank as ActiveBankInfo,
            amount: borrowOrLendAmount,
          },
        });
        capture(`user_${currentAction.toLowerCase()}`, {
          uuid: attemptUuid,
          tokenSymbol: bank.meta.tokenSymbol,
          tokenName: bank.meta.tokenName,
          amount: borrowOrLendAmount,
          txn: txnSig!,
          priorityFee,
        });
      }

      // -------- Refresh state
      try {
        setIsRefreshingStore(true);
        await fetchTradeState({
          connection,
          wallet,
          refresh: true,
        });
      } catch (error: any) {
        console.log("Error while reloading state");
        console.log(error);
      }
    },
    [
      setIsLoading,
      priorityFee,
      handleCloseDialog,
      setAmountRaw,
      setIsActionComplete,
      setPreviousTxn,
      setIsRefreshingStore,
      fetchTradeState,
      connection,
      wallet,
    ]
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
        txnType: "LEND",
        txn: txnSig!,
        lendingOptions: {
          type: ActionType.Withdraw,
          bank: selectedBank as ActiveBankInfo,
          amount: 0,
        },
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
    handleCloseDialog && handleCloseDialog();

    try {
      setIsRefreshingStore(true);
      await fetchTradeState({
        connection,
        wallet,
        refresh: true,
      });
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [
    selectedBank,
    selectedAccount,
    priorityFee,
    setIsLoading,
    setAmountRaw,
    handleCloseDialog,
    setPreviousTxn,
    setIsRefreshingStore,
    fetchTradeState,
    connection,
    wallet,
  ]);

  const handleAction = async () => {
    if (actionMode === ActionType.MintLST || actionMode === ActionType.UnstakeLST) {
      await handleLstAction();
    } else {
      await handleLendingAction();
    }
  };

  const handleLstAction = React.useCallback(async () => {
    if ((!selectedBank && !selectedStakingAccount) || !mfiClient || !lstData) {
      return;
    }

    if (selectedBank && !lstQuoteMeta) {
      return;
    }
    setIsLoading(true);
    const attemptUuid = uuidv4();

    if (selectedBank) {
      capture(`user_${actionMode.toLowerCase()}_initiate`, {
        uuid: attemptUuid,
        tokenSymbol: selectedBank.meta.tokenSymbol,
        tokenName: selectedBank.meta.tokenName,
        amount,
        priorityFee,
      });
    } else {
      capture(`user_${actionMode.toLowerCase()}_initiate`, {
        uuid: attemptUuid,
        tokenSymbol: "SOL",
        tokenName: "Solana",
        amount,
        priorityFee,
      });
    }

    const txnSig = await executeLstAction({
      actionMode,
      marginfiClient: mfiClient,
      amount,
      connection,
      wallet,
      lstData,
      bank: selectedBank,
      nativeSolBalance,
      selectedStakingAccount,
      quoteResponseMeta: lstQuoteMeta,
      priorityFee,
    });

    setIsLoading(false);
    handleCloseDialog && handleCloseDialog();
    setAmountRaw("");

    if (txnSig) {
      setIsActionComplete(true);

      setPreviousTxn({
        txn: txnSig!,
        txnType: "LST",
        lstOptions: {
          type: ActionType.MintLST,
          bank: selectedBank as ActiveBankInfo,
          amount: amount,
          quote: lstQuoteMeta || undefined,
        },
      });
      if (selectedBank) {
        capture(`user_${actionMode.toLowerCase()}`, {
          uuid: attemptUuid,
          tokenSymbol: selectedBank.meta.tokenSymbol,
          tokenName: selectedBank.meta.tokenName,
          amount,
          txn: txnSig!,
          priorityFee,
        });
      } else {
        capture(`user_${actionMode.toLowerCase()}`, {
          uuid: attemptUuid,
          tokenSymbol: "SOL",
          tokenName: "Solana",
          amount,
          txn: txnSig!,
          priorityFee,
        });
      }
    }

    // -------- Refresh state
    try {
      setIsRefreshingStore(true);
      await fetchTradeState({
        connection,
        wallet,
        refresh: true,
      });
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [
    selectedBank,
    selectedStakingAccount,
    mfiClient,
    lstData,
    lstQuoteMeta,
    setIsLoading,
    actionMode,
    amount,
    connection,
    wallet,
    nativeSolBalance,
    priorityFee,
    handleCloseDialog,
    setAmountRaw,
    setIsActionComplete,
    setPreviousTxn,
    setIsRefreshingStore,
    fetchTradeState,
  ]);

  const handleLendingAction = React.useCallback(async () => {
    if (!actionMode || !selectedBank || (!amount && !repayAmount)) {
      return;
    }

    const action = async () => {
      const params = {
        mfiClient,
        actionType: actionMode,
        bank: selectedBank,
        amount,
        nativeSolBalance,
        marginfiAccount: selectedAccount,
        walletContextState,
      } as MarginfiActionParams;

      if (repayCollatQuote && repayAmount && selectedRepayBank && connection && wallet) {
        params.repayWithCollatOptions = {
          repayCollatQuote,
          repayCollatTxn: repayCollatTxns.repayCollatTxn,
          bundleTipTxn: repayCollatTxns.bundleTipTxn,
          repayAmount: repayAmount,
          repayBank: selectedRepayBank,
          connection,
        };
      }

      executeLendingActionCb(params);
    };

    await action();
  }, [
    actionMode,
    selectedBank,
    amount,
    repayAmount,
    mfiClient,
    nativeSolBalance,
    selectedAccount,
    walletContextState,
    repayCollatQuote,
    selectedRepayBank,
    connection,
    wallet,
    executeLendingActionCb,
    repayCollatTxns.repayCollatTxn,
    repayCollatTxns.bundleTipTxn,
  ]);

  if (!isInitialized) {
    return null;
  }

  if (isActionDisabled) {
    return (
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "p-4 md:p-6 bg-background w-full max-w-[480px] rounded-lg relative",
            isDialog && "py-5 border border-background-gray-light/50"
          )}
        >
          Action is temporary disabled. <br /> Visit our socials for more information.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center">
        <div className={cn("p-2 md:p-3 bg-background w-full max-w-[480px] rounded-lg relative", isDialog && "py-5")}>
          {isSettingsMode ? (
            <ActionBoxSettings
              repayMode={repayMode}
              actionMode={actionMode}
              toggleSettings={setIsSettingsMode}
              setSlippageBps={(value) => setSlippageBps(value * 100)}
              slippageBps={slippageBps / 100}
            />
          ) : (
            <>
              <ActionBoxInput
                walletAmount={walletAmount}
                amountRaw={amountRaw}
                maxAmount={maxAmount}
                showCloseBalance={showCloseBalance}
                selectedAccount={selectedAccount}
                isTokenSelectable={isTokenSelectable}
                isDialog={isDialog}
                tokensOverride={
                  requestedCollateralBank && requestedBank ? [requestedBank, requestedCollateralBank] : undefined
                }
                activeGroup={activeGroup}
              />

              {additionalActionMethods.concat(actionMethods).map(
                (actionMethod, idx) =>
                  actionMethod.description && (
                    <div className="pb-6" key={idx}>
                      <div
                        className={cn(
                          "flex space-x-2 py-2.5 px-3.5 rounded-lg gap-1 text-sm",
                          actionMethod.actionMethod === "INFO" && "bg-accent text-info-foreground",
                          (!actionMethod.actionMethod || actionMethod.actionMethod === "WARNING") &&
                            "bg-accent text-alert-foreground",
                          actionMethod.actionMethod === "ERROR" && "bg-[#990000] text-primary"
                        )}
                      >
                        <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
                        <div className="space-y-1">
                          <p>{actionMethod.description}</p>
                          {actionMethod.link && (
                            <p>
                              <Link
                                href={actionMethod.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:no-underline"
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
                selectedAccount={selectedAccount}
                actionMode={actionMode}
                amount={amount}
                slippageBps={slippageBps}
                // isEnabled={hasPreviewShown}
                isEnabled={true}
                repayWithCollatOptions={
                  repayCollatQuote && repayAmount && selectedRepayBank
                    ? {
                        repayCollatQuote,
                        repayCollatTxn: repayCollatTxns.repayCollatTxn,
                        bundleTipTxn: repayCollatTxns.bundleTipTxn,
                        repayAmount,
                        repayBank: selectedRepayBank,
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
                      className="text-xs gap-1 h-6 px-2 flex items-center rounded-full border transition-colors text-muted-foreground hover:bg-accent"
                    >
                      Settings <IconSettings size={16} />
                    </button>
                  </div>
                </div>
              </ActionBoxPreview>
            </>
          )}
        </div>
      </div>
    </>
  );
};
