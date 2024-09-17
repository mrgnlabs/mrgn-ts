import React from "react";

import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

import { IconAlertTriangle, IconExternalLink, IconSettings } from "@tabler/icons-react";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import {
  MarginfiActionParams,
  closeBalance,
  executeLendingAction,
  ActionMethod,
  RepayType,
} from "@mrgnlabs/mrgn-utils";
import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { useUiStore, useTradeStore } from "~/store";
import { cn, capture } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { useActionBoxStore } from "~/hooks/useActionBoxStore";

import { checkActionAvailable } from "~/utils/actionBoxUtils";
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
  isTokenSelectable,
  handleCloseDialog,
}: ActionBoxProps) => {
  const [isInitialized, setIsRefreshingStore, groupMap, nativeSolBalance, refreshGroup] = useTradeStore((state) => [
    state.initialized,
    state.setIsRefreshingStore,
    state.groupMap,
    state.nativeSolBalance,
    state.refreshGroup,
  ]);

  const [
    slippageBps,
    amountRaw,
    repayAmountRaw,
    maxAmountCollat,
    actionMode,
    repayMode,
    selectedBank,
    selectedRepayBank,
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

  const { walletContextState, connected, wallet } = useWalletContext();
  const { connection } = useConnection();

  const [isSettingsMode, setIsSettingsMode] = React.useState<boolean>(false);
  const [additionalActionMethods, setAdditionalActionMethods] = React.useState<ActionMethod[]>([]);

  const activeGroup = React.useMemo(() => {
    if (!selectedBank && !requestedBank) return null;
    const bank = selectedBank ?? requestedBank;
    const group = groupMap.get(bank?.info.rawBank.group.toBase58() ?? "");
    return group ?? null;
  }, [selectedBank, requestedBank, groupMap]);

  const selectedAccount = React.useMemo(() => {
    if (requestedAccount) {
      return requestedAccount;
    } else if (activeGroup?.selectedAccount) {
      return activeGroup.selectedAccount;
    } else {
      return null;
    }
  }, [requestedAccount, activeGroup?.selectedAccount]);

  const extendedBankInfos = React.useMemo(() => {
    return activeGroup ? [activeGroup.pool.token, ...activeGroup.pool.quoteTokens] : [];
  }, [activeGroup]);

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
    if (!selectedBank || !isInitialized) {
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
      default:
        return 0;
    }
  }, [selectedBank, actionMode, isInitialized, walletAmount, maxAmountCollat, repayMode]);

  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(() => actionMode === ActionType.Withdraw && isDust, [actionMode, isDust]);

  const actionMethods = React.useMemo(
    () =>
      checkActionAvailable({
        amount,
        repayAmount,
        connected,
        showCloseBalance,
        selectedBank,
        selectedRepayBank,
        extendedBankInfos,
        marginfiAccount: selectedAccount,
        nativeSolBalance,
        actionMode,
        blacklistRoutes: null,
        repayMode,
        repayCollatQuote: repayCollatQuote ?? null,
      }),
    [
      amount,
      repayAmount,
      connected,
      showCloseBalance,
      selectedBank,
      selectedRepayBank,
      extendedBankInfos,
      selectedAccount,
      nativeSolBalance,
      actionMode,
      repayMode,
      repayCollatQuote,
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
          tokenSymbol: bank.meta.tokenSymbol,
          tokenName: bank.meta.tokenName,
          amount: borrowOrLendAmount,
          txn: txnSig!,
          priorityFee,
        });
      }

      // -------- Refresh state
      try {
        if (!activeGroup) return;

        setIsRefreshingStore(true);
        await refreshGroup({
          connection,
          wallet,
          groupPk: activeGroup?.groupPk,
        });
        setIsRefreshingStore(false);
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
      refreshGroup,
      connection,
      wallet,
      activeGroup,
    ]
  );

  const handleCloseBalance = React.useCallback(async () => {
    if (!selectedBank || !selectedAccount) {
      return;
    }
    setIsLoading(true);
    const attemptUuid = uuidv4();

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
      if (!activeGroup) return;
      setIsRefreshingStore(true);
      await refreshGroup({
        connection,
        wallet,
        groupPk: activeGroup?.groupPk,
      });
      setIsRefreshingStore(false);
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
    connection,
    wallet,
    activeGroup,
    refreshGroup,
  ]);

  const handleLendingAction = React.useCallback(async () => {
    console.log("handleLendingAction", activeGroup);
    if (!actionMode || !activeGroup?.client || !selectedBank || (!amount && !repayAmount)) {
      return;
    }

    const action = async () => {
      const params = {
        mfiClient: activeGroup.client,
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
          feedCrankTxs: repayCollatTxns.feedCrankTxs,
          withdrawAmount: repayAmount,
          depositBank: selectedRepayBank,
          connection,
        };
      }

      executeLendingActionCb(params);
    };

    await action();
  }, [
    actionMode,
    activeGroup,
    selectedBank,
    amount,
    repayAmount,
    nativeSolBalance,
    selectedAccount,
    walletContextState,
    repayCollatQuote,
    selectedRepayBank,
    connection,
    wallet,
    executeLendingActionCb,
    repayCollatTxns.repayCollatTxn,
    repayCollatTxns.feedCrankTxs,
  ]);

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

  // Cleanup the store when the component unmounts or wallet disconnects
  React.useEffect(() => {
    return () => refreshState();
  }, [refreshState, connected]);

  if (!isInitialized) {
    return null;
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
                activeGroup={activeGroup}
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
                        feedCrankTxs: repayCollatTxns.feedCrankTxs,
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
                    showCloseBalance ? handleCloseBalance() : handleLendingAction();
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
