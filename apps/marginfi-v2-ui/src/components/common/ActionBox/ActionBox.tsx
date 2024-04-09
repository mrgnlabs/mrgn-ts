import React from "react";

import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

import { PublicKey } from "@solana/web3.js";
import { createJupiterApiClient, QuoteGetRequest, QuoteResponse } from "@jup-ag/api";

import { WSOL_MINT, nativeToUi, numeralFormatter, uiToNative } from "@mrgnlabs/mrgn-common";
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
  getBlockedActions,
} from "~/utils";
import { LendingModes } from "~/types";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";
import { useDebounce } from "~/hooks/useDebounce";
import { SOL_MINT } from "~/store/lstStore";

import { LSTDialog, LSTDialogVariants } from "~/components/common/AssetList";
import { checkActionAvailable, getSwapQuoteWithRetry, LstType, RepayType } from "~/utils/actionBoxUtils";
import { IconAlertTriangle, IconChevronDown, IconSettings, IconEye, IconEyeClosed } from "~/components/ui/icons";
import { showErrorToast } from "~/utils/toastUtils";

import {
  ActionBoxPreview,
  ActionBoxSettings,
  ActionBoxActions,
  ActionBoxInput,
} from "~/components/common/ActionBox/components";

type ActionBoxProps = {
  requestedAction?: ActionType;
  requestedToken?: PublicKey;
  isDialog?: boolean;
  handleCloseDialog?: () => void;
};

type BlackListRoutesMap = {
  [tokenIdentifier: string]: {
    blacklistRoutes: string[];
  };
};

export const ActionBox = ({ requestedAction, requestedToken, isDialog, handleCloseDialog }: ActionBoxProps) => {
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
    () =>
      (requestedAction === ActionType.Repay
        ? LendingModes.BORROW
        : requestedAction === ActionType.Withdraw
        ? LendingModes.LEND
        : undefined) ?? lendingModeFromStore,
    [lendingModeFromStore, requestedAction]
  );

  const [slippageBps, setSlippageBps] = React.useState<number>(100);

  const [amountRaw, setAmountRaw] = React.useState<string>("");
  const [repayAmountRaw, setRepayAmountRaw] = React.useState<string>("");
  const [maxAmountCollat, setMaxAmountCollat] = React.useState<number>();

  const [actionMode, setActionMode] = React.useState<ActionType>(ActionType.Deposit);
  const [repayMode, setRepayMode] = React.useState<RepayType>(RepayType.RepayRaw);
  const [lstMode, setLstMode] = React.useState<LstType>(LstType.Token);

  const [selectedTokenBank, setSelectedTokenBank] = React.useState<PublicKey | null>(null);
  const [selectedRepayTokenBank, setSelectedRepayTokenBank] = React.useState<PublicKey | null>(null);
  const [isSettingsMode, setIsSettingsMode] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [hasLSTDialogShown, setHasLSTDialogShown] = React.useState<LSTDialogVariants[]>([]);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);
  const [blacklistRoutesMap, setBlacklistRoutesMap] = React.useState<BlackListRoutesMap>();
  const [hasPreviewShown, setHasPreviewShown] = React.useState<boolean>(false);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  // Either a staking account is selected or a bank
  const isActionDisabled = React.useMemo(() => {
    const blockedActions = getBlockedActions();

    if (blockedActions?.find((value) => value === actionMode)) return true;

    return false;
  }, [actionMode]);

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

  const blacklistRoutes = React.useMemo(
    () =>
      selectedBank && blacklistRoutesMap
        ? blacklistRoutesMap[selectedBank.info.state.mint.toBase58()]?.blacklistRoutes?.map(
            (key) => new PublicKey(key)
          ) ?? []
        : undefined,
    [blacklistRoutesMap, selectedBank]
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

  const repayAmount = React.useMemo(() => {
    const strippedAmount = repayAmountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [repayAmountRaw]);

  const debouncedRepayAmount = useDebounce<number | null>(repayAmount, 500);

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
        blacklistRoutes: blacklistRoutes ?? null,
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
      selectedStakingAccount,
      extendedBankInfos,
      selectedAccount,
      nativeSolBalance,
      actionMode,
      blacklistRoutes,
      repayMode,
      repayCollatQuote,
    ]
  );

  const actionModePrev = usePrevious(actionMode);
  const selectedRepayBankPrev = usePrevious(selectedRepayBank);
  const selectedBankPrev = usePrevious(selectedBank);
  const debouncedRepayAmountPrev = usePrevious(debouncedRepayAmount);
  const slippageBpsPrev = usePrevious(slippageBps);

  React.useEffect(() => {
    if (actionModePrev !== null && actionModePrev !== actionMode) {
      setAmountRaw("");
      setRepayAmountRaw("");
    }
  }, [actionModePrev, actionMode, selectedTokenBank, setAmountRaw, setRepayAmountRaw]);

  // React.useEffect(() => {
  //   setAmountRaw("");
  // }, [lendingMode, selectedTokenBank, setAmountRaw]);

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
    } else {
      setActionMode(requestedAction);
    }
  }, [lendingMode, setActionMode, requestedAction]);

  React.useEffect(() => {
    if (actionMode !== ActionType.Repay) {
      setRepayMode(RepayType.RepayRaw);
    }
    if (actionMode === ActionType.MintLST) {
      setHasPreviewShown(true);
    }
  }, [actionMode, setRepayMode, setHasPreviewShown]);

  React.useEffect(() => {
    if (amount && amount > maxAmount) {
      if (repayMode !== RepayType.RepayCollat) {
        setAmountRaw(numberFormater.format(maxAmount));
      }
    }
  }, [maxAmount, repayMode, amount, numberFormater, setAmountRaw]);

  React.useEffect(() => {
    if (selectedStakingAccount) {
      setAmountRaw(numberFormater.format(maxAmount));
    }
  }, [selectedStakingAccount, numberFormater, maxAmount, setAmountRaw]);

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
        setBlacklistRoutesMap(responseBody);
      }
    } catch (error) {}
  };

  const calculateMaxCollat = React.useCallback(
    async (bank: ExtendedBankInfo, repayBank: ExtendedBankInfo) => {
      const amount = repayBank.isActive && repayBank.position.isLending ? repayBank.position.amount : 0;
      const maxRepayAmount = bank.isActive ? bank?.position.amount : 0;

      if (amount !== 0) {
        setIsLoading(true);
        const quoteParams = {
          amount: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
          inputMint: repayBank.info.state.mint.toBase58(),
          outputMint: bank.info.state.mint.toBase58(),
          slippageBps: slippageBps,
          swapMode: "ExactIn" as any,
          maxAccounts: 20,
          // onlyDirectRoutes: true,
        } as QuoteGetRequest;

        try {
          const swapQuoteInput = await getSwapQuoteWithRetry(quoteParams);

          if (!swapQuoteInput) throw new Error();

          const inputInOtherAmount = nativeToUi(swapQuoteInput.otherAmountThreshold, bank.info.state.mintDecimals);

          if (inputInOtherAmount > maxRepayAmount) {
            const quoteParams = {
              amount: uiToNative(maxRepayAmount, bank.info.state.mintDecimals).toNumber(),
              inputMint: repayBank.info.state.mint.toBase58(), // USDC
              outputMint: bank.info.state.mint.toBase58(), // JITO
              slippageBps: slippageBps,
              swapMode: "ExactOut",
              // onlyDirectRoutes: true,
            } as QuoteGetRequest;

            const swapQuoteOutput = await getSwapQuoteWithRetry(quoteParams);
            if (!swapQuoteOutput) throw new Error();

            const inputOutOtherAmount =
              nativeToUi(swapQuoteOutput.otherAmountThreshold, repayBank.info.state.mintDecimals) * 1.01; // add this if dust appears: "* 1.01"
            setMaxAmountCollat(inputOutOtherAmount);
          } else {
            setMaxAmountCollat(amount);
          }
        } catch {
          setMaxAmountCollat(0);
          showErrorToast("Failed to fetch max amount, please refresh.");
        } finally {
          setIsLoading(false);
        }
      }
    },
    [slippageBps, setMaxAmountCollat, setIsLoading]
  );

  const calculateRepayCollateral = React.useCallback(
    async (bank: ExtendedBankInfo, repayBank: ExtendedBankInfo, amount: number) => {
      const maxRepayAmount = bank.isActive ? bank?.position.amount : 0;

      const quoteParams = {
        amount: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
        inputMint: repayBank.info.state.mint.toBase58(),
        outputMint: bank.info.state.mint.toBase58(),
        slippageBps: slippageBps,
        swapMode: "ExactIn",
        maxAccounts: 20,
        // onlyDirectRoutes: true,
      } as QuoteGetRequest;

      try {
        if (amount == 0) {
          setAmountRaw("0");
          setRepayCollatQuote(undefined);
          return;
        }
        setIsLoading(true);
        const swapQuote = await getSwapQuoteWithRetry(quoteParams);

        if (swapQuote) {
          const outAmount = nativeToUi(swapQuote.outAmount, bank.info.state.mintDecimals);
          const outAmountThreshold = nativeToUi(swapQuote.otherAmountThreshold, bank.info.state.mintDecimals);

          const amountToRepay = outAmount > maxRepayAmount ? maxRepayAmount : outAmountThreshold;

          setAmountRaw(amountToRepay.toString());

          setRepayCollatQuote(swapQuote);
        }
      } catch (error) {
        showErrorToast("Unable to retrieve data. Please choose a different collateral option or refresh the page.");
      } finally {
        setIsLoading(false);
      }
    },
    [slippageBps, setAmountRaw, setRepayCollatQuote]
  );

  // Calculate repay w/ collat max value
  React.useEffect(() => {
    if (selectedRepayBank && selectedBank) {
      const isRepayBankChanged = !selectedRepayBankPrev?.address.equals(selectedRepayBank.address);
      const isBankChanged = !selectedBankPrev?.address.equals(selectedBank.address);
      const isSlippageChanged = slippageBpsPrev !== slippageBps;

      if ((isBankChanged || isRepayBankChanged || isSlippageChanged) && repayMode === RepayType.RepayCollat) {
        setRepayAmountRaw("");
        calculateMaxCollat(selectedBank, selectedRepayBank);
      }
    } else {
      setRepayCollatQuote(undefined);
      setRepayAmountRaw("");
      setMaxAmountCollat(0);
    }
  }, [
    repayMode,
    selectedRepayBankPrev,
    selectedBankPrev,
    selectedRepayBank,
    selectedBank,
    slippageBps,
    slippageBpsPrev,
    calculateMaxCollat,
    setRepayCollatQuote,
    setRepayAmountRaw,
  ]);

  // Calculate repay w/ collat repaying value
  React.useEffect(() => {
    if (selectedRepayBank && selectedBank) {
      const isRepayBankChanged = !selectedRepayBankPrev?.address.equals(selectedRepayBank.address);
      const isBankChanged = !selectedBankPrev?.address.equals(selectedBank.address);
      const isAmountChanged = debouncedRepayAmountPrev !== debouncedRepayAmount;
      const isSlippageChanged = slippageBpsPrev !== slippageBps;

      if (
        debouncedRepayAmount !== null &&
        repayMode === RepayType.RepayCollat &&
        (isAmountChanged || isBankChanged || isRepayBankChanged || isSlippageChanged)
      ) {
        calculateRepayCollateral(selectedBank, selectedRepayBank, debouncedRepayAmount);
      }
    }
  }, [
    debouncedRepayAmount,
    debouncedRepayAmountPrev,
    repayMode,
    selectedRepayBank,
    selectedBank,
    selectedRepayBankPrev,
    selectedBankPrev,
    slippageBps,
    slippageBpsPrev,
    calculateRepayCollateral,
  ]);

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
          type: currentAction,
          bank: bank as ActiveBankInfo,
          amount: borrowOrLendAmount,
          txn: txnSig!,
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

    if (selectedBank && !quoteResponseMeta) {
      return;
    }
    setIsLoading(true);

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
    actionMode,
    selectedBank,
    selectedStakingAccount,
    mfiClient,
    lstData,
    quoteResponseMeta,
    amount,
    connection,
    wallet,
    nativeSolBalance,
    priorityFee,
    handleCloseDialog,
    setIsActionComplete,
    setPreviousTxn,
    setIsRefreshingStore,
    fetchMrgnlendState,
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
          repayAmount: repayAmount,
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

  if (!isInitialized) {
    return null;
  }

  if (isActionDisabled) {
    return (
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "p-4 md:p-6 bg-background-gray text-white w-full max-w-[480px] rounded-xl relative",
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
        <div
          className={cn(
            "p-2 md:p-4 bg-background-gray text-white w-full max-w-[480px] rounded-xl relative",
            isDialog && "py-5 border border-background-gray-light/50"
          )}
        >
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
                actionMode={actionMode}
                repayMode={repayMode}
                lstType={lstMode}
                selectedBank={selectedBank}
                selectedRepayBank={selectedRepayBank}
                selectedTokenBank={selectedTokenBank}
                selectedRepayTokenBank={selectedRepayTokenBank}
                selectedStakingAccount={selectedStakingAccount}
                blacklistRepayTokens={blacklistRoutes}
                walletAmount={walletAmount}
                amountRaw={amountRaw}
                repayAmountRaw={repayAmountRaw}
                maxAmount={maxAmount}
                showCloseBalance={showCloseBalance}
                isDialog={isDialog}
                onSetTokenBank={(bank) => setSelectedTokenBank(bank)}
                onSetTokenRepayBank={(bank) => setSelectedRepayTokenBank(bank)}
                onSetAmountRaw={(amount) => setAmountRaw(amount)}
                onSetRepayAmountRaw={(amount) => setRepayAmountRaw(amount)}
                changeRepayType={(repayType) => setRepayMode(repayType)}
                changeLstType={(lstType) => {
                  setSelectedTokenBank(null);
                  setLstMode(lstType);
                }}
              />

              {actionMethods.map(
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
                        <div className="flex flex-col md:items-center md:flex-row gap-1">
                          <p>{actionMethod.description}</p>
                          {actionMethod.link && (
                            <p>
                              <span className="hidden md:inline">-</span>{" "}
                              <Link
                                href={actionMethod.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:no-underline"
                              >
                                Read more
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
                // isEnabled={hasPreviewShown}
                isEnabled={true}
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
                  showCloseBalance={showCloseBalance ?? false}
                  isEnabled={!actionMethods.filter((value) => value.isEnabled === false).length}
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
