import React from "react";

import { PublicKey } from "@solana/web3.js";
import { createJupiterApiClient, QuoteGetRequest, QuoteResponse } from "@jup-ag/api";

import { WSOL_MINT, nativeToUi, percentFormatter, uiToNative } from "@mrgnlabs/mrgn-common";
import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useLstStore, useMrgnlendStore, useUiStore } from "~/store";
import {
  MarginfiActionParams,
  clampedNumeralFormatter,
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
import { checkActionAvailable, ActionBoxActions } from "~/components/common/ActionBox";
import { Input } from "~/components/ui/input";
import { IconAlertTriangle, IconWallet, IconSettings } from "~/components/ui/icons";
import { showErrorToast } from "~/utils/toastUtils";

import { ActionBoxPreview } from "./ActionBoxPreview";
import { ActionBoxTokens } from "./ActionBoxTokens";
import { ActionBoxHeader } from "./ActionBoxHeader";
import { ActionBoxSettings } from "./ActionBoxSettings";

type ActionBoxProps = {
  requestedAction?: ActionType;
  requestedToken?: PublicKey;
  requestedLendingMode?: LendingModes;
  isDialog?: boolean;
  handleCloseDialog?: () => void;
};

type DirectRoutesMap = {
  [tokenIdentifier: string]: {
    directRoutes: string[];
  };
};

export enum RepayType {
  RepayRaw = "Repay",
  RepayCollat = "Collateral Repay",
}

export const ActionBox = ({
  requestedAction,
  requestedToken,
  requestedLendingMode,
  isDialog,
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
  const [lendingModeFromStore, setLendingMode, priorityFee, setPriorityFee, setIsActionComplete, setPreviousTxn] =
    useUiStore((state) => [
      state.lendingMode,
      state.setLendingMode,
      state.priorityFee,
      state.setPriorityFee,
      state.setIsActionComplete,
      state.setPreviousTxn,
    ]);
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
        if (repayMode === RepayType.RepayCollat)
          return (maxAmountCollat ?? 0) > (selectedBank?.userInfo.maxRepay ?? 0)
            ? selectedBank?.userInfo.maxRepay ?? 0
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

  const amountInputRef = React.useRef<HTMLInputElement>(null);
  const repayAmountInputRef = React.useRef<HTMLInputElement>(null);
  const rawRepayAmount = React.useMemo(
    () => (repayAmount ? numberFormater.format(repayAmount) : undefined),
    [repayAmount, numberFormater]
  );

  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(() => actionMode === ActionType.Withdraw && isDust, [actionMode, isDust]);

  const isInputDisabled = React.useMemo(
    () => (maxAmount === 0 && !showCloseBalance) || !!selectedStakingAccount,
    [maxAmount, showCloseBalance, selectedStakingAccount]
  );

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
    ]
  );

  const titleText = React.useMemo(() => {
    if (actionMode === ActionType.Borrow) {
      return "You borrow";
    } else if (actionMode === ActionType.Deposit) {
      return "You supply";
    } else if (actionMode === ActionType.Withdraw) {
      return "You withdraw";
    } else if (actionMode === ActionType.Repay) {
      return "You repay";
    } else if (actionMode === ActionType.MintLST) {
      return "You stake";
    } else {
      return "";
    }
  }, [actionMode]);

  const actionModePrev = usePrevious(actionMode);

  const priorityFeeLabel = React.useMemo(() => {
    if (priorityFee === 0) return "Normal";
    if (priorityFee === 0.00005) return "High";
    if (priorityFee === 0.005) return "Mamas";
    return "Custom";
  }, [priorityFee]);

  // React.useEffect(() => {
  //   if (amount > 0 && selectedBank && !selectedBank.info.state.mint.equals(SOL_MINT)) {
  //     //loading
  //   }
  // }, [selectedBank]);

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
    const quoteParams = {
      amount: uiToNative(repayBank.userInfo.maxWithdraw, repayBank.info.state.mintDecimals).toNumber(),
      inputMint: repayBank.info.state.mint.toBase58(),
      outputMint: bank.info.state.mint.toBase58(),
      slippageBps: slippageBps,
      swapMode: "ExactIn" as any,
    } as QuoteGetRequest;

    try {
      const swapQuote = await getSwapQuoteWithRetry(quoteParams);

      if (swapQuote) {
        const withdrawAmount = nativeToUi(swapQuote.otherAmountThreshold, bank.info.state.mintDecimals);
        setMaxAmountCollat(withdrawAmount);
      }
    } catch {
      showErrorToast("Failed to fetch max amount, please refresh.");
    }
  };

  const calculateRepayCollateral = async (bank: ExtendedBankInfo, repayBank: ExtendedBankInfo, amount: number) => {
    const quoteParams = {
      amount: uiToNative(amount, bank.info.state.mintDecimals).toNumber(),
      inputMint: repayBank.info.state.mint.toBase58(),
      outputMint: bank.info.state.mint.toBase58(),
      slippageBps: slippageBps,
      swapMode: "ExactOut",
      onlyDirectRoutes: true,
    } as QuoteGetRequest;

    try {
      const swapQuote = await getSwapQuoteWithRetry(quoteParams);
      if (swapQuote) {
        const withdrawAmount = nativeToUi(swapQuote.otherAmountThreshold, repayBank.info.state.mintDecimals);
        setRepayAmount(withdrawAmount);
        setRepayCollatQuote(swapQuote);
      }
    } catch (error) {
      showErrorToast("Unable to retrieve data. Please choose a different collateral option or refresh the page.");
    }
  };

  async function getSwapQuoteWithRetry(quoteParams: QuoteGetRequest, maxRetries = 3, timeout = 1000) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const swapQuote = await jupiterQuoteApi.quoteGet(quoteParams);
        return swapQuote; // Success, return the result
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        attempt++;
        if (attempt === maxRetries) {
          throw new Error(`Failed to get to quote after ${maxRetries} attempts`);
        }
        await new Promise((resolve) => setTimeout(resolve, timeout));
      }
    }
  }

  // Does this do anything? I don't think so
  // React.useEffect(() => {
  //   if (
  //     actionMode === ActionType.Withdraw &&
  //     !(selectedBank?.isActive && selectedBank?.position?.isLending && lendingMode === LendingModes.LEND)
  //   ) {
  //     setSelectedTokenBank(null);
  //   } else if (
  //     actionMode === ActionType.Repay &&
  //     !(selectedBank?.isActive && !selectedBank?.position?.isLending && lendingMode === LendingModes.BORROW)
  //   ) {
  //     setSelectedTokenBank(null);
  //   }
  // }, [selectedBank, actionMode, setActionMode, lendingMode]);

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

  const handleInputChange = React.useCallback(
    (newAmount: string) => {
      let formattedAmount: string, amount: number;
      // Remove commas from the formatted string
      const newAmountWithoutCommas = newAmount.replace(/,/g, "");
      let decimalPart = newAmountWithoutCommas.split(".")[1];
      const mintDecimals = selectedBank?.info.state.mintDecimals ?? 9;

      if (
        (newAmount.endsWith(",") || newAmount.endsWith(".")) &&
        !newAmount.substring(0, newAmount.length - 1).includes(".")
      ) {
        amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
        formattedAmount = numberFormater.format(amount).concat(".");
      } else {
        const isDecimalPartInvalid = isNaN(Number.parseFloat(decimalPart));
        if (!isDecimalPartInvalid) decimalPart = decimalPart.substring(0, mintDecimals);
        decimalPart = isDecimalPartInvalid
          ? ""
          : ".".concat(Number.parseFloat("1".concat(decimalPart)).toString().substring(1));
        amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
        formattedAmount = numberFormater.format(amount).split(".")[0].concat(decimalPart);
      }

      if (amount > maxAmount) {
        setAmountRaw(numberFormater.format(maxAmount));
      } else {
        setAmountRaw(formattedAmount);
      }
    },
    [maxAmount, setAmountRaw, selectedBank, numberFormater]
  );

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
              <ActionBoxHeader
                actionType={actionMode}
                repayType={repayMode}
                changeRepayType={(repayType: RepayType) => setRepayMode(repayType)}
                bank={selectedBank}
              />
              <div className="flex flex-row items-center justify-between mb-3">
                {!isDialog || actionMode === ActionType.MintLST || actionMode === ActionType.Repay ? (
                  <div className="text-lg font-normal flex items-center">{titleText}</div>
                ) : (
                  <div />
                )}
                {(selectedBank || selectedStakingAccount) && (
                  <div className="inline-flex gap-1.5 items-center">
                    <IconWallet size={16} />
                    <span className="text-sm font-normal">
                      {selectedBank &&
                        (walletAmount !== undefined
                          ? clampedNumeralFormatter(walletAmount).concat(" ", selectedBank.meta.tokenSymbol)
                          : "-")}
                      {selectedStakingAccount &&
                        clampedNumeralFormatter(nativeToUi(selectedStakingAccount.lamports, 9)).concat(" SOL")}
                    </span>
                    <button
                      className={`text-xs ml-1 h-6 py-1 px-2 flex flex-row items-center justify-center rounded-full border border-background-gray-light bg-transparent text-muted-foreground ${
                        maxAmount === 0 ? "" : "cursor-pointer hover:bg-background-gray-light"
                      } transition-colors`}
                      onClick={() => setAmountRaw(numberFormater.format(maxAmount))}
                      disabled={maxAmount === 0}
                    >
                      MAX
                    </button>
                  </div>
                )}
              </div>
              <div className="bg-background text-3xl rounded-lg flex flex-wrap xs:flex-nowrap gap-3 xs:gap-0 justify-center items-center p-4 font-medium mb-5">
                <div className="w-full xs:w-[162px]">
                  <ActionBoxTokens
                    isDialog={isDialog}
                    currentTokenBank={selectedTokenBank}
                    setCurrentTokenBank={(tokenBank) => {
                      setSelectedTokenBank(tokenBank);
                      setAmountRaw("");
                    }}
                    actionMode={actionMode}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    ref={amountInputRef}
                    inputMode="numeric"
                    value={amountRaw}
                    disabled={isInputDisabled}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="0"
                    className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
                  />
                </div>
              </div>

              {actionMode === ActionType.Repay && repayMode === RepayType.RepayCollat && (
                <>
                  <div className="flex flex-row font-normal items-center justify-between mb-3">
                    <div className="text-lg flex items-center">Using collateral</div>
                    {selectedRepayBank && (
                      <div className="inline-flex gap-1.5 items-center text-sm">
                        <span className="text-muted-foreground">Supplied:</span>
                        {selectedRepayBank &&
                          (selectedRepayBank.userInfo.maxWithdraw !== undefined
                            ? clampedNumeralFormatter(selectedRepayBank.userInfo.maxWithdraw).concat(
                                " ",
                                selectedRepayBank.meta.tokenSymbol
                              )
                            : "-")}
                      </div>
                    )}
                  </div>
                  <div className="bg-[#171C1C] text-3xl rounded-lg flex flex-wrap xs:flex-nowrap gap-3 xs:gap-0 justify-center items-center px-3 py-2.5 mb-5">
                    <div className="w-full xs:w-[162px]">
                      <ActionBoxTokens
                        isDialog={isDialog}
                        repayTokenBank={selectedRepayTokenBank}
                        setRepayTokenBank={setSelectedRepayTokenBank}
                        actionMode={actionMode}
                        highlightedTokens={directRoutes}
                        repay={true}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={rawRepayAmount}
                        disabled={true}
                        placeholder="0"
                        className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base cursor-default"
                      />
                    </div>
                  </div>
                </>
              )}

              {actionMethod.description && (
                <div className="pb-6">
                  <div className="flex space-x-2 py-2.5 px-3.5 rounded-xl gap-1 text-alert-foreground bg-alert text-sm">
                    <IconAlertTriangle className="shrink-0 translate-y-0.5" size={16} />
                    <p className="text-alert-foreground">{actionMethod.description}</p>
                  </div>
                </div>
              )}

              <ActionBoxPreview
                selectedBank={selectedBank}
                selectedStakingAccount={selectedStakingAccount}
                actionMode={actionMode}
                amount={amount}
                isEnabled={actionMethod.isEnabled}
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

                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setIsSettingsMode(true)}
                    className="text-xs gap-1 ml-1 h-6 py-1 px-2 flex flex-row items-center justify-center rounded-full border border-background-gray-light bg-transparent hover:bg-background-gray-light text-muted-foreground"
                  >
                    Settings <IconSettings size={16} />
                  </button>
                </div>

                {/* <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => setIsPriorityFeesMode(true)}
                    className="text-xs gap-1 ml-1 h-6 py-1 px-2 flex flex-row items-center justify-center rounded-full border border-background-gray-light bg-transparent hover:bg-background-gray-light text-muted-foreground"
                  >
                    Txn priority: {priorityFeeLabel} <IconSettings size={16} />
                  </button>
                  {(actionMode === ActionType.MintLST || repayMode === RepayType.RepayCollat) && (
                    <button
                      onClick={() => setIsSlippageMode(true)}
                      className="text-xs gap-1 ml-1 h-6 py-1 px-2 flex flex-row items-center justify-center rounded-full border border-background-gray-light bg-transparent hover:bg-background-gray-light text-muted-foreground"
                    >
                      Txn slippage: {slippageBps / 100 + " %"} <IconSettings size={16} />
                    </button>
                  )}
                </div> */}
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
