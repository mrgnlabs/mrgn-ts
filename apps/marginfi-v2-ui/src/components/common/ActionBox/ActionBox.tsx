import React from "react";

import { PublicKey } from "@solana/web3.js";
import { createJupiterApiClient, QuoteGetRequest, QuoteResponse } from "@jup-ag/api";

import { WSOL_MINT, nativeToUi, uiToNative } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useLstStore, useMrgnlendStore, useUiStore } from "~/store";
import {
  MarginfiActionParams,
  closeBalance,
  executeLendingAction,
  usePrevious,
  cn,
  capture,
  executeLstAction,
} from "~/utils";
import { LendingModes } from "~/types";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { useDebounce } from "~/hooks/useDebounce";
import { SOL_MINT } from "~/store/lstStore";

import { LSTDialog, LSTDialogVariants } from "~/components/common/AssetList";
import { checkActionAvailable, RepayType } from "~/utils/actionBoxUtils";
import { IconAlertTriangle, IconChevronDown, IconSettings, IconEye, IconEyeClosed } from "~/components/ui/icons";
import { showErrorToast } from "~/utils/toastUtils";

import {
  ActionBoxPreview,
  ActionBoxHeader,
  ActionBoxSettings,
  ActionBoxActions,
  ActionBoxInput,
  ActionBoxRepayInput,
} from "~/components/common/ActionBox/components";

type ActionBoxProps = {
  requestedAction?: ActionType;
  requestedToken?: PublicKey;
  requestedLendingMode?: LendingModes;
  isDialog?: boolean;
  showLendingHeader?: boolean;
  handleCloseDialog?: () => void;
};

type DirectRoutesMap = {
  [tokenIdentifier: string]: {
    directRoutes: string[];
  };
};

export const ActionBox = ({
  requestedAction,
  requestedToken,
  requestedLendingMode,
  isDialog,
  showLendingHeader,
  handleCloseDialog,
}: ActionBoxProps) => {
  const jupiterQuoteApi = createJupiterApiClient();
  const [
    mfiClient,
    nativeSolBalance,
    setIsRefreshingStore,
    fetchMrgnlendState,
    selectedAccount,
    extendedBankInfos,
    isInitialized,
  ] = useMrgnlendStore((state) => [
    state.marginfiClient,
    state.nativeSolBalance,
    state.setIsRefreshingStore,
    state.fetchMrgnlendState,
    state.selectedAccount,
    state.extendedBankInfos,
    state.initialized,
  ]);
  const [lendingModeFromStore, priorityFee, setPriorityFee, setIsActionComplete, setPreviousTxn] = useUiStore(
    (state) => [
      state.lendingMode,
      state.priorityFee,
      state.setPriorityFee,
      state.setIsActionComplete,
      state.setPreviousTxn,
    ]
  );
  const [lstData, stakeAccounts, quoteResponseMeta, feesAndRent] = useLstStore((state) => [
    state.lstData,
    state.stakeAccounts,
    state.quoteResponseMeta,
    state.feesAndRent,
  ]);

  const { walletContextState, connected, wallet } = useWalletContext();
  const { connection } = useConnection();

  const lendingMode = React.useMemo(
    () => requestedLendingMode ?? lendingModeFromStore,
    [lendingModeFromStore, requestedLendingMode]
  );

  const [slippageBps, setSlippageBps] = React.useState<number>(100);

  const [amountRaw, setAmountRaw] = React.useState<string>("");
  const [repayAmountRaw, setRepayAmountRaw] = React.useState<string>("");
  const [maxAmountCollat, setMaxAmountCollat] = React.useState<number>();

  const [actionMode, setActionMode] = React.useState<ActionType>(ActionType.Deposit);
  const [repayMode, setRepayMode] = React.useState<RepayType>(RepayType.RepayRaw);
  const [selectedTokenBank, setSelectedTokenBank] = React.useState<PublicKey | null>(null);
  const [selectedRepayTokenBank, setSelectedRepayTokenBank] = React.useState<PublicKey | null>(null);
  const [isSettingsMode, setIsSettingsMode] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [hasLSTDialogShown, setHasLSTDialogShown] = React.useState<LSTDialogVariants[]>([]);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);
  const [directRoutesMap, setDirectRoutesMap] = React.useState<DirectRoutesMap>();
  const [hasPreviewShown, setHasPreviewShown] = React.useState<boolean>(false);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  // Either a staking account is selected or a bank
  const selectedStakingAccount = React.useMemo(
    () => (selectedTokenBank ? stakeAccounts.find((acc) => acc.address.equals(selectedTokenBank)) ?? null : null),
    [selectedTokenBank, stakeAccounts]
  );
  const selectedBank = React.useMemo(
    () =>
      selectedTokenBank
        ? extendedBankInfos.find((bank) => bank?.address?.equals && bank?.address?.equals(selectedTokenBank)) ?? null
        : null,
    [extendedBankInfos, selectedTokenBank]
  );

  const directRoutes = React.useMemo(
    () =>
      selectedBank && directRoutesMap
        ? directRoutesMap[selectedBank.info.state.mint.toBase58()].directRoutes.map((key) => new PublicKey(key))
        : undefined,
    [directRoutesMap, directRoutesMap]
  );

  const selectedRepayBank = React.useMemo(
    () =>
      selectedRepayTokenBank
        ? extendedBankInfos.find((bank) => bank?.address?.equals && bank?.address?.equals(selectedRepayTokenBank)) ??
          null
        : null,
    [extendedBankInfos, selectedRepayTokenBank]
  );

  // Amount related useMemo's
  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const debouncedAmount = useDebounce<number | null>(amount, 500);

  const walletAmount = React.useMemo(
    () =>
      selectedBank?.info.state.mint?.equals && selectedBank?.info.state.mint?.equals(WSOL_MINT)
        ? selectedBank?.userInfo.tokenAccount.balance + nativeSolBalance
        : selectedBank?.userInfo.tokenAccount.balance,
    [nativeSolBalance, selectedBank]
  );

  const [repayAmount, setRepayAmount] = React.useState<number>();
  const [repayCollatQuote, setRepayCollatQuote] = React.useState<QuoteResponse>();

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
        if (repayMode === RepayType.RepayCollat && selectedBank?.isActive)
          return (maxAmountCollat ?? 0) > (selectedBank?.position.amount ?? 0)
            ? selectedBank?.position.amount ?? 0
            : maxAmountCollat ?? 0;
        return selectedBank?.userInfo.maxRepay ?? 0;
      case ActionType.MintLST:
        if (selectedStakingAccount) return nativeToUi(selectedStakingAccount.lamports, 9);
        if (selectedBank?.info.state.mint.equals(SOL_MINT))
          return walletAmount ? Math.max(0, walletAmount - nativeToUi(feesAndRent, 9)) : 0;
        else return walletAmount ?? 0;
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

  const rawRepayAmount = React.useMemo(
    () => (repayAmount ? numberFormater.format(repayAmount) : undefined),
    [repayAmount, numberFormater]
  );

  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(() => actionMode === ActionType.Withdraw && isDust, [actionMode, isDust]);

  const actionMethod = React.useMemo(
    () =>
      checkActionAvailable({
        amount,
        connected,
        showCloseBalance,
        selectedBank,
        selectedRepayBank,
        selectedStakingAccount,
        extendedBankInfos,
        marginfiAccount: selectedAccount,
        nativeSolBalance,
        actionMode,
        directRoutes: directRoutes ?? null,
        repayMode,
        repayCollatQuote: repayCollatQuote ?? null,
      }),
    [
      amount,
      connected,
      showCloseBalance,
      selectedBank,
      selectedRepayBank,
      extendedBankInfos,
      selectedAccount,
      nativeSolBalance,
      actionMode,
      directRoutes,
      repayMode,
      repayCollatQuote,
    ]
  );

  const actionModePrev = usePrevious(actionMode);

  React.useEffect(() => {
    if (actionModePrev !== null && actionModePrev !== actionMode) {
      setAmountRaw("");
    }
  }, [actionModePrev, actionMode, setAmountRaw]);

  React.useEffect(() => {
    setAmountRaw("");
  }, [lendingMode, selectedTokenBank, setAmountRaw]);

  React.useEffect(() => {
    if (requestedToken) {
      setSelectedTokenBank(requestedToken);
    }
  }, [requestedToken, setSelectedTokenBank]);

  React.useEffect(() => {
    if (lendingModeFromStore && !isDialog) {
      setSelectedTokenBank(null);
    }
  }, [lendingModeFromStore, isDialog, setSelectedTokenBank]);

  React.useEffect(() => {
    if (!requestedAction) {
      if (lendingMode === LendingModes.LEND) {
        setActionMode(ActionType.Deposit);
      } else {
        setActionMode(ActionType.Borrow);
      }
    }
  }, [lendingMode, setActionMode, requestedAction]);

  React.useEffect(() => {
    if (requestedAction) {
      setActionMode(requestedAction);
    }
  }, [requestedAction, setActionMode]);

  React.useEffect(() => {
    if (actionMode !== ActionType.Repay) {
      setRepayMode(RepayType.RepayRaw);
    }
  }, [actionMode, setRepayMode]);

  React.useEffect(() => {
    if (amount && amount > maxAmount) {
      setAmountRaw(numberFormater.format(maxAmount));
    }
  }, [maxAmount, amount, numberFormater, setAmountRaw]);

  React.useEffect(() => {
    if (selectedStakingAccount) {
      setAmountRaw(numberFormater.format(maxAmount));
    }
  }, [selectedStakingAccount, numberFormater, maxAmount, setAmountRaw]);

  React.useEffect(() => {
    if (repayMode === RepayType.RepayCollat && selectedRepayBank && selectedBank) {
      calculateMaxCollat(selectedBank, selectedRepayBank);
    } else {
      setRepayCollatQuote(undefined);
      setRepayAmount(undefined);
    }
  }, [repayMode, selectedRepayBank, selectedBank, setRepayCollatQuote, setRepayAmount]);

  React.useEffect(() => {
    if (debouncedAmount && repayMode === RepayType.RepayCollat && selectedRepayBank && selectedBank) {
      calculateRepayCollateral(selectedBank, selectedRepayBank, debouncedAmount);
    }
  }, [debouncedAmount, repayMode, selectedRepayBank, selectedBank]);

  React.useEffect(() => {
    fetchDirectRoutes();
  }, []);

  const fetchDirectRoutes = async () => {
    try {
      const response = await fetch(`/api/jupiter`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const responseBody = await response.json();

      if (responseBody) {
        setDirectRoutesMap(responseBody);
      }
    } catch (error) {}
  };

  const calculateMaxCollat = async (bank: ExtendedBankInfo, repayBank: ExtendedBankInfo) => {
    // const amount = repayBank.isActive && repayBank.position.isLending ? repayBank.position.amount : 0;
    // if (amount !== 0) {
    //   const quoteParams = {
    //     amount: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
    //     inputMint: repayBank.info.state.mint.toBase58(),
    //     outputMint: bank.info.state.mint.toBase58(),
    //     slippageBps: slippageBps,
    //     onlyDirectRoutes: true,
    //     swapMode: "ExactIn" as any,
    //     maxAccounts: 20,
    //   } as QuoteGetRequest;
    //   try {
    //     const swapQuote = await getSwapQuoteWithRetry(quoteParams);
    //     if (swapQuote) {
    //       const withdrawAmount = nativeToUi(swapQuote.otherAmountThreshold, bank.info.state.mintDecimals);
    //       setMaxAmountCollat(withdrawAmount);
    //     }
    //   } catch {
    //     showErrorToast("Failed to fetch max amount, please refresh.");
    //   }
    // }
  };

  const calculateRepayCollateral = async (bank: ExtendedBankInfo, repayBank: ExtendedBankInfo, amount: number) => {
    //   const quoteParams = {
    //     amount: uiToNative(amount, bank.info.state.mintDecimals).toNumber(),
    //     inputMint: repayBank.info.state.mint.toBase58(),
    //     outputMint: bank.info.state.mint.toBase58(),
    //     slippageBps: slippageBps,
    //     swapMode: "ExactOut",
    //     onlyDirectRoutes: true,
    //   } as QuoteGetRequest;
    //   try {
    //     const swapQuote = await getSwapQuoteWithRetry(quoteParams);
    //     if (swapQuote) {
    //       const withdrawAmount = nativeToUi(swapQuote.otherAmountThreshold, repayBank.info.state.mintDecimals);
    //       setRepayAmount(withdrawAmount);
    //       setRepayCollatQuote(swapQuote);
    //     }
    //   } catch (error) {
    //     showErrorToast("Unable to retrieve data. Please choose a different collateral option or refresh the page.");
    //   }
    // };
    // async function getSwapQuoteWithRetry(quoteParams: QuoteGetRequest, maxRetries = 5, timeout = 1000) {
    //   let attempt = 0;
    //   while (attempt < maxRetries) {
    //     try {
    //       const swapQuote = await jupiterQuoteApi.quoteGet(quoteParams);
    //       return swapQuote; // Success, return the result
    //     } catch (error) {
    //       console.error(`Attempt ${attempt + 1} failed:`, error);
    //       attempt++;
    //       if (attempt === maxRetries) {
    //         throw new Error(`Failed to get to quote after ${maxRetries} attempts`);
    //       }
    //       await new Promise((resolve) => setTimeout(resolve, timeout));
    //     }
    //   }
  };

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
          type: currentAction,
          bank: bank as ActiveBankInfo,
          amount: borrowOrLendAmount,
          txn: txnSig!,
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
        setIsRefreshingStore(true);
        await fetchMrgnlendState();
      } catch (error: any) {
        console.log("Error while reloading state");
        console.log(error);
      }
    },
    [fetchMrgnlendState, setIsRefreshingStore, priorityFee, setPreviousTxn, setIsActionComplete, handleCloseDialog]
  );

  const handleCloseBalance = React.useCallback(async () => {
    try {
      if (!selectedBank || !selectedAccount) {
        throw new Error();
      }
      await closeBalance({ marginfiAccount: selectedAccount, bank: selectedBank, priorityFee });
    } catch (error) {
      return;
    }

    setAmountRaw("");
    handleCloseDialog && handleCloseDialog();

    try {
      setIsRefreshingStore(true);
      await fetchMrgnlendState();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [selectedBank, selectedAccount, fetchMrgnlendState, setIsRefreshingStore, priorityFee, handleCloseDialog]);

  const handleAction = async () => {
    if (actionMode === ActionType.MintLST) {
      await handleLstAction();
    } else {
      await handleLendingAction();
    }
  };

  const handleLstAction = React.useCallback(async () => {
    if ((!selectedBank && !selectedStakingAccount) || !mfiClient || !lstData) {
      return;
    }

    if (selectedBank && !quoteResponseMeta) {
      return;
    }
    setIsLoading(true);

    const txnSig = await executeLstAction({
      marginfiClient: mfiClient,
      amount,
      connection,
      wallet,
      lstData,
      bank: selectedBank,
      nativeSolBalance,
      selectedStakingAccount,
      quoteResponseMeta,
      priorityFee,
    });

    setIsLoading(false);
    handleCloseDialog && handleCloseDialog();
    setAmountRaw("");

    if (txnSig) {
      setIsActionComplete(true);
      setPreviousTxn({
        type: ActionType.MintLST,
        bank: selectedBank as ActiveBankInfo,
        amount: amount,
        lstQuote: quoteResponseMeta || undefined,
        txn: txnSig!,
      });
      // capture(`user_${currentAction.toLowerCase()}`, {
      //   tokenSymbol: bank.meta.tokenSymbol,
      //   tokenName: bank.meta.tokenName,
      //   amount: borrowOrLendAmount,
      //   txn: txnSig!,
      //   priorityFee,
      // });
    }

    // -------- Refresh state
    try {
      setIsRefreshingStore(true);
      await fetchMrgnlendState();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [
    mfiClient,
    selectedBank,
    selectedStakingAccount,
    amount,
    priorityFee,
    connection,
    wallet,
    lstData,
    quoteResponseMeta,
    fetchMrgnlendState,
    setIsRefreshingStore,
    handleCloseDialog,
  ]);

  const handleLendingAction = React.useCallback(async () => {
    if (!actionMode || !selectedBank || !amount) {
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
          repayAmount,
          repayBank: selectedRepayBank,
          connection,
          wallet,
        };
      }

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
    selectedAccount,
    amount,
    hasLSTDialogShown,
    executeLendingActionCb,
    mfiClient,
    nativeSolBalance,
    walletContextState,
    repayCollatQuote,
    repayAmount,
    selectedRepayBank,
    connection,
    wallet,
  ]);

  React.useEffect(() => {
    setPriorityFee(0.005);
  }, [setPriorityFee]);

  if (!isInitialized) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "p-6 bg-background-gray text-white w-full max-w-[480px] rounded-xl relative",
            isDialog && "py-5 border border-background-gray-light/50"
          )}
        >
          {isSettingsMode ? (
            <ActionBoxSettings
              mode={actionMode}
              toggleSettings={setIsSettingsMode}
              setSlippageBps={(value) => setSlippageBps(value * 100)}
              slippageBps={slippageBps / 100}
            />
          ) : (
            <>
              {/* <ActionBoxHeader
                actionType={actionMode}
                repayType={repayMode}
                showLendingHeader={showLendingHeader}
                changeRepayType={(repayType: RepayType) => setRepayMode(repayType)}
                bank={selectedBank}
              /> */}
              <ActionBoxInput
                actionMode={actionMode}
                repayMode={repayMode}
                selectedBank={selectedBank}
                selectedRepayBank={selectedRepayBank}
                selectedTokenBank={selectedTokenBank}
                selectedRepayTokenBank={selectedRepayTokenBank}
                selectedStakingAccount={selectedStakingAccount}
                highlightedRepayTokens={directRoutes}
                walletAmount={walletAmount}
                amountRaw={amountRaw}
                repayAmountRaw={repayAmountRaw}
                maxAmount={maxAmount}
                showCloseBalance={showCloseBalance}
                isDialog={isDialog}
                showLendingHeader={showLendingHeader}
                onSetTokenBank={(bank) => setSelectedTokenBank(bank)}
                onSetTokenRepayBank={(bank) => setSelectedRepayTokenBank(bank)}
                onSetAmountRaw={(amount) => setAmountRaw(amount)}
                onSetRepayAmountRaw={(amount) => setRepayAmountRaw(amount)}
                changeRepayType={(repayType: RepayType) => setRepayMode(repayType)}
              />
              {/* {actionMode === ActionType.Repay && repayMode === RepayType.RepayCollat && (
                <ActionBoxRepayInput
                  actionMode={actionMode}
                  selectedRepayBank={selectedRepayBank}
                  selectedRepayTokenBank={selectedRepayTokenBank}
                  directRoutes={directRoutes}
                  rawRepayAmount={rawRepayAmount}
                  repayMode={repayMode}
                  isDialog={isDialog}
                  onSetSelectedBank={(bank) => setSelectedRepayTokenBank(bank)}
                />
              )} */}

              {actionMethod.description && (
                <div className="pb-6">
                  <div
                    className={cn(
                      "flex space-x-2 py-2.5 px-3.5 rounded-xl gap-1 text-sm",
                      actionMethod.primaryColor ?? "text-alert-foreground",
                      actionMethod.backgroundColor ?? "bg-alert"
                    )}
                  >
                    <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
                    <p className="">{actionMethod.description}</p>
                  </div>
                </div>
              )}

              <ActionBoxPreview
                selectedBank={selectedBank}
                selectedStakingAccount={selectedStakingAccount}
                actionMode={actionMode}
                amount={amount}
                isEnabled={actionMethod.isEnabled && hasPreviewShown}
                repayWithCollatOptions={
                  repayCollatQuote && repayAmount && selectedRepayBank
                    ? {
                        repayCollatQuote,
                        repayAmount,
                        repayBank: selectedRepayBank,
                        connection,
                        wallet,
                      }
                    : undefined
                }
              >
                <ActionBoxActions
                  handleAction={() => {
                    showCloseBalance ? handleCloseBalance() : handleAction();
                  }}
                  isLoading={isLoading}
                  isEnabled={actionMethod.isEnabled && amount > 0}
                  actionMode={actionMode}
                />
                <div className="flex justify-between mt-3">
                  {actionMethod.isEnabled ? (
                    <button
                      className={cn(
                        "flex text-muted-foreground text-xs items-center cursor-pointer transition hover:text-primary",
                        actionMethod.isEnabled ? "cursor-pointer" : "cursor-not-allowed"
                      )}
                      onClick={() => actionMethod.isEnabled && setHasPreviewShown(!hasPreviewShown)}
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
                  )}
                  <div className="flex justify-end gap-2">
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
          )}
        </div>
      </div>
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
