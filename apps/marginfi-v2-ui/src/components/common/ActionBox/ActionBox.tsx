import React from "react";

import {
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { createJupiterApiClient, QuoteGetRequest, QuoteResponse } from "@jup-ag/api";

import {
  DEFAULT_CONFIRM_OPTS,
  WSOL_MINT,
  Wallet,
  nativeToUi,
  percentFormatter,
  uiToNative,
} from "@mrgnlabs/mrgn-common";
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
  repayWithCollat,
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

  const amountInputRef = React.useRef<HTMLInputElement>(null);
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
    const amount = repayBank.isActive && repayBank.position.isLending ? repayBank.position.amount : 0;

    if (amount !== 0) {
      let isSolMint = false;
      if (repayBank.info.state.mint.equals(SOL_MINT) || bank.info.state.mint.equals(SOL_MINT)) {
        isSolMint = true;
      }
      const quoteParams = {
        amount: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
        inputMint: repayBank.info.state.mint.toBase58(),
        outputMint: bank.info.state.mint.toBase58(),
        slippageBps: slippageBps,
        maxAccounts: isSolMint ? 15 : 20,
        platformFeeBps: 25,
        swapMode: "ExactIn",
        restrictIntermediateTokens: isSolMint ? true : false,
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
    }
  };

  const calculateRepayCollateral = async (bank: ExtendedBankInfo, repayBank: ExtendedBankInfo, amount: number) => {
    const quoteParams = {
      amount: uiToNative(amount, bank.info.state.mintDecimals).toNumber(),
      inputMint: repayBank.info.state.mint.toBase58(),
      outputMint: bank.info.state.mint.toBase58(),
      slippageBps: slippageBps,
      platformFeeBps: 25,
      swapMode: "ExactOut",
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

  async function getSwapQuoteWithRetry(quoteParams: QuoteGetRequest, maxRetries = 5, timeout = 1000) {
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

  async function compareTokens() {
    if (!selectedAccount || !connection || !wallet || !extendedBankInfos) {
      console.log("hold up");
      return;
    }

    const tokenMints = Object.keys(tokenDirectRoutesa);
    const results = []; // Initialize results array

    console.log("startin");

    for (let i = 0; i < tokenMints.length; i++) {
      const mintA = tokenMints[i];
      const bankaObject = extendedBankInfos.find((v) => v.info.state.mint.equals(new PublicKey(mintA)));

      if (!bankaObject) {
        console.log(`No bankaObject found for mint: ${mintA}`);
        break; // Skip to the next iteration if not found
      }

      const routes = tokenDirectRoutesa[mintA].directRoutes;

      for (let j = 0; j < routes.length; j++) {
        const mintB = routes[j];

        const bankbObject = extendedBankInfos.find((v) => v.info.state.mint.equals(new PublicKey(mintB)));
        const amoo = bababank.find((v) => v.mint === mintA)?.amount;

        if (!bankbObject || !amoo) {
          console.log(`No bankbObject found for mint: ${mintB}`);
          break; // Skip to the next iteration if not found
        }

        // Define quote parameters based on the current pair of tokens
        let isSolMint = false;
        if (mintA === SOL_MINT.toBase58() || mintB === SOL_MINT.toBase58()) {
          isSolMint = true;
        }
        const quoteParams = {
          amount: uiToNative(amoo, bankaObject.info.state.mintDecimals).toNumber(),
          inputMint: mintA,
          outputMint: mintB,
          slippageBps: 200,
          maxAccounts: isSolMint ? 15 : 20,
          platformFeeBps: 25,
          swapMode: "ExactIn",
          restrictIntermediateTokens: isSolMint ? true : false,
        } as QuoteGetRequest;

        // Attempt to get a swap quote for the current pair of tokens
        let swapQuote;
        try {
          swapQuote = await getSwapQuoteWithRetry(quoteParams);
        } catch (error) {
          console.log(`Error getting swap quote: ${error}`);
        }

        if (swapQuote) {
          let tx;
          // console.log({ test: Number(swapQuote.inAmount) / Math.pow(10, bankaObject.info.state.mintDecimals) });
          try {
            tx = await repayWithCollat({
              marginfiAccount: selectedAccount,
              bank: bankbObject,
              amount: amoo, // Ensure `amount` is correctly defined
              options: {
                repayCollatQuote: swapQuote,
                repayAmount: Number(swapQuote.inAmount) / Math.pow(10, bankaObject.info.state.mintDecimals), // Make sure this is what you want
                repayBank: bankaObject,
                connection,
                wallet,
              },
            });
          } catch (error) {
            console.log(`Error processing transaction: ${error}`);
          }

          if (tx) {
            try {
              let signedTx;
              try {
                signedTx = await processTransaction(connection, wallet, tx);
              } catch (error) {
                console.log(`Error signing transaction: ${error}`);
              }
              if (signedTx) {
                const serialized = signedTx.serialize().length + 64;
                results.push({
                  minta: mintA,
                  mintb: mintB,
                  serialized: serialized,
                  success: serialized < 1232,
                  swapQuote: true,
                });
              }
            } catch {
              results.push({
                minta: mintA,
                mintb: mintB,
                success: false,
                swapQuote: true,
              });
            }
          } else {
            results.push({
              minta: mintA,
              mintb: mintB,
              success: false,
              swapQuote: true,
            });
          }

          // console.log(`Successful swap quote from ${bankaObject.meta.tokenSymbol} to ${bankbObject.meta.tokenSymbol}`);
          // Handle successful quote (e.g., log it, store it, etc.)
        } else {
          results.push({
            minta: mintA,
            mintb: mintB,
            success: false,
            swapQuote: false,
          });
          console.log(
            `Failed to get swap quote from ${bankaObject.meta.tokenSymbol} to ${bankbObject.meta.tokenSymbol}`
          );
          // Handle failure (e.g., log it, move on to the next pair, etc.)
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    console.log({ results });
  }

  React.useEffect(() => {
    setPriorityFee(0.005);
  }, [setPriorityFee]);

  if (!isInitialized) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => {
          compareTokens();
        }}
      >
        hihiiiii
      </button>
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
                        {selectedRepayBank.isActive &&
                          selectedRepayBank.position.isLending &&
                          (selectedRepayBank.position.amount
                            ? clampedNumeralFormatter(selectedRepayBank.position.amount).concat(
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
                        isRepay={true}
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

const tokenDirectRoutesa: DirectRoutesMap = {
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
      "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp",
      "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
      "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
      "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    ],
  },
  So11111111111111111111111111111111111111112: {
    directRoutes: [
      "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
      "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
      "LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp",
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
      "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
      "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
      "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y",
      "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
      "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
      "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
      "BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA",
      "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",
      "AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR",
      "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
      "RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a",
      "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey",
      "DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ",
      "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6",
      "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
      "4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy",
      "StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT",
      "LFG1ezantSY2LPX8jRz2qa31pPEhpwN9msFDzZw4T9Q",
      "BqVHWpwUDgMik5gbTciFfozadpE2oZth5bxCDrgbDt52",
    ],
  },
  bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1: {
    directRoutes: [
      "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      "So11111111111111111111111111111111111111112",
      "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      "7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT",
      "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
      "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
      "BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA",
      "ZScHuTtqZukUrtZS43teTKGs2VqkKL8k4QCouR2n6Uo",
      "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
    ],
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    directRoutes: [
      "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      "So11111111111111111111111111111111111111112",
      "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
      "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
      "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
      "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey",
      "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
    ],
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    directRoutes: [
      "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      "So11111111111111111111111111111111111111112",
      "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
      "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
      "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
      "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
      "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y",
      "7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT",
      "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
      "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
      "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
      "BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA",
      "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",
      "AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR",
      "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
      "RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a",
      "DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ",
      "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6",
      "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
      "4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy",
      "mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6",
      "StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT",
    ],
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
      "mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6",
    ],
  },
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y",
      "AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR",
    ],
  },
  LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp: {
    directRoutes: ["J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", "So11111111111111111111111111111111111111112"],
  },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
      "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
      "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
      "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
      "AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR",
      "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    ],
  },
  "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh": {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
      "6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU",
    ],
  },
  jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL: {
    directRoutes: [
      "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
      "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    ],
  },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
      "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
      "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
      "BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA",
      "AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR",
      "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    ],
  },
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs": {
    directRoutes: [
      "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      "So11111111111111111111111111111111111111112",
      "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
      "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
    ],
  },
  "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4": {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    ],
  },
  SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
      "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
      "4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy",
    ],
  },
  "7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT": {
    directRoutes: ["bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
  },
  WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      "AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR",
    ],
  },
  HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3: {
    directRoutes: [
      "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      "So11111111111111111111111111111111111111112",
      "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
      "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y",
      "mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6",
    ],
  },
  rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof: {
    directRoutes: ["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
  },
  BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    ],
  },
  hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6",
    ],
  },
  AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
      "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    ],
  },
  orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE: {
    directRoutes: [
      "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y",
      "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
    ],
  },
  RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    ],
  },
  ZScHuTtqZukUrtZS43teTKGs2VqkKL8k4QCouR2n6Uo: {
    directRoutes: ["J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1"],
  },
  MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey: {
    directRoutes: ["So11111111111111111111111111111111111111112", "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"],
  },
  DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ: {
    directRoutes: ["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
  },
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU": {
    directRoutes: ["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
  },
  kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6: {
    directRoutes: ["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
  },
  "6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU": {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    ],
  },
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
      "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
      "ZScHuTtqZukUrtZS43teTKGs2VqkKL8k4QCouR2n6Uo",
    ],
  },
  "4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy": {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y",
    ],
  },
  mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6: {
    directRoutes: [
      "So11111111111111111111111111111111111111112",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",
    ],
  },
  StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT: {
    directRoutes: ["So11111111111111111111111111111111111111112", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
  },
  LFG1ezantSY2LPX8jRz2qa31pPEhpwN9msFDzZw4T9Q: {
    directRoutes: ["So11111111111111111111111111111111111111112"],
  },
  BqVHWpwUDgMik5gbTciFfozadpE2oZth5bxCDrgbDt52: {
    directRoutes: ["So11111111111111111111111111111111111111112"],
  },
};

const bababank = [
  {
    token: "Jito Staked SOL",
    mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    decimals: 9,
    amount: 10,
  },
  {
    token: "Wrapped SOL",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    amount: 10,
  },
  {
    token: "BlazeStake Staked SOL (bSOL)",
    mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    decimals: 9,
    amount: 10,
  },
  {
    token: "Marinade staked SOL (mSOL)",
    mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    decimals: 9,
    amount: 10,
  },
  {
    token: "USD Coin",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    amount: 1000,
  },
  {
    token: "USDT",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    amount: 1000,
  },
  {
    token: "dogwifhat",
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    decimals: 6,
    amount: 2000,
  },
  {
    token: "Liquid Staking Token",
    mint: "LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp",
    decimals: 9,
    amount: 10,
  },
  {
    token: "Bonk",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
    amount: 70921985,
  },
  {
    token: "Wrapped BTC (Portal)",
    mint: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    decimals: 8,
    amount: 0.1,
  },
  {
    token: "JITO",
    mint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    decimals: 9,
    amount: 500,
  },
  {
    token: "Jupiter",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
    amount: 2000,
  },
  {
    token: "Ether (Portal)",
    mint: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    decimals: 8,
    amount: 1,
  },
  {
    token: "Jupiter Perps LP",
    mint: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
    decimals: 6,
    amount: 500,
  },
  {
    token: "Shadow Token",
    mint: "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y",
    decimals: 9,
    amount: 800,
  },
  {
    token: "UXD Stablecoin",
    mint: "7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT",
    decimals: 6,
    amount: 1000,
  },
  {
    token: "Wen",
    mint: "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
    decimals: 5,
    amount: 11119759,
  },
  {
    token: "Pyth Network",
    mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    decimals: 6,
    amount: 2000,
  },
  {
    token: "Render Token",
    mint: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
    decimals: 8,
    amount: 150,
  },
  {
    token: "Blaze",
    mint: "BLZEEuZUBVqFhj8adcCFPJvPVCiCyVmh3hkJMrU8KuJA",
    decimals: 9,
    amount: 1000,
  },
  {
    token: "Helium Network Token",
    mint: "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",
    decimals: 8,
    amount: 200,
  },
  {
    token: "Guacamole",
    mint: "AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR",
    decimals: 5,
    amount: 9124087591,
  },
  {
    token: "Orca",
    mint: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    decimals: 6,
    amount: 400,
  },
  {
    token: "Rollbit Coin",
    mint: "RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a",
    decimals: 2,
    amount: 10000,
  },
  {
    token: "Lido Wrapped Staked ETH",
    mint: "ZScHuTtqZukUrtZS43teTKGs2VqkKL8k4QCouR2n6Uo",
    decimals: 8,
    amount: 1,
  },
  {
    token: "Marinade",
    mint: "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey",
    decimals: 9,
    amount: 10000,
  },
  {
    token: "DUST Protocol",
    mint: "DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ",
    decimals: 9,
    amount: 5000,
  },
  {
    token: "Samoyed Coin",
    mint: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    decimals: 9,
    amount: 191021,
  },
  {
    token: "KIN",
    mint: "kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6",
    decimals: 5,
    amount: 82203041,
  },
  {
    token: "tBTC v2",
    mint: "6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU",
    decimals: 8,
    amount: 0.1,
  },
  {
    token: "Lido Staked SOL",
    mint: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
    decimals: 9,
    amount: 10,
  },
  {
    token: "HONEY",
    mint: "4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy",
    decimals: 9,
    amount: 10000,
  },
  {
    token: "Helium Mobile",
    mint: "mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6",
    decimals: 6,
    amount: 100,
  },
  {
    token: "Step",
    mint: "StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT",
    decimals: 9,
    amount: 20000,
  },
  {
    token: "LessFnGas",
    mint: "LFG1ezantSY2LPX8jRz2qa31pPEhpwN9msFDzZw4T9Q",
    decimals: 7,
    amount: 492610837,
  },
  {
    token: "Only Possible On Solana",
    mint: "BqVHWpwUDgMik5gbTciFfozadpE2oZth5bxCDrgbDt52",
    decimals: 9,
    amount: 2000,
  },
];

export async function processTransaction(
  connection: Connection,
  wallet: Wallet,
  transaction: Transaction | VersionedTransaction
): Promise<VersionedTransaction> {
  let signature: TransactionSignature = "";

  try {
    let versionedTransaction: VersionedTransaction;

    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    if (transaction instanceof Transaction) {
      const versionedMessage = new TransactionMessage({
        instructions: transaction.instructions,
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
      });

      versionedTransaction = new VersionedTransaction(versionedMessage.compileToV0Message([]));
    } else {
      versionedTransaction = transaction;
    }

    const keypair = new Keypair();
    // versionedTransaction.pa([keypair]);

    // versionedTransaction = await wallet.signTransaction(versionedTransaction);

    return versionedTransaction;
  } catch (error: any) {
    if (error.logs) {
      console.log("------ Logs 👇 ------");
      console.log(error.logs.join("\n"));
    }

    throw `Transaction failed! ${error?.message}`;
  }
}
