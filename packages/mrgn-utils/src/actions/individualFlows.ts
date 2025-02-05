import { SwapRequest, createJupiterApiClient } from "@jup-ag/api";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import {
  AddressLookupTableAccount,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SolanaJSONRPCError,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { ExtendedBankInfo, clearAccountCache } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  MarginfiAccountWrapper,
  MarginfiClient,
  ProcessTransactionError,
  ProcessTransactionsClientOpts,
} from "@mrgnlabs/marginfi-client-v2";
import {
  TransactionOptions,
  Wallet,
  dynamicNumeralFormatter,
  uiToNative,
  TransactionType,
  addTransactionMetadata,
  TransactionConfigMap,
} from "@mrgnlabs/mrgn-common";

import { WalletContextStateOverride } from "../wallet";
import { showErrorToast, MultiStepToastHandle } from "../toasts";
import { extractErrorString, isWholePosition } from "../mrgnUtils";
import { makeDepositSolToStakePoolIx, makeDepositStakeToStakePoolIx } from "../lstUtils";

import { getMaybeSquadsOptions } from "./helpers";
import {
  LstData,
  StakeData,
  MarginfiActionParams,
  LoopingProps,
  ActionTxns,
  RepayWithCollatProps,
  IndividualFlowError,
  TradeActionTxns,
  ClosePositionActionTxns,
  RepayProps,
} from "./types";
import { captureSentryException } from "../sentry.utils";
import { loopingBuilder, repayWithCollatBuilder } from "./flashloans";
import { STATIC_SIMULATION_ERRORS } from "../errors";
import { ExecuteDepositSwapActionProps } from "./actions";

//-----------------------//
// Local utils functions //
//-----------------------//

export function getSteps({
  actionTxns,
  excludedTypes,
  customLabels,
}: {
  actionTxns?: ActionTxns;
  excludedTypes?: TransactionType[];
  customLabels?: Partial<Record<TransactionType, string>>;
}) {
  const steps: { label: string }[] = [];

  steps.push({ label: "Signing transaction" });

  const filteredTransactions = actionTxns?.transactions.filter((tx) => !excludedTypes?.includes(tx.type));

  filteredTransactions?.forEach((tx) => {
    steps.push({ label: customLabels?.[tx.type] ?? TransactionConfigMap[tx.type].label });
  });

  return steps;
}

export function isStepIncluded(label: string, excludedTypes: TransactionType[]): boolean {
  // Check if the step label corresponds to any excluded transaction type
  return !excludedTypes.some((type) => TransactionConfigMap[type].label === label);
}

function detectBroadcastType(signature: string): "RPC" | "BUNDLE" | "UNKNOWN" {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const hexRegex = /^[0-9a-fA-F]{64}$/;

  if (base58Regex.test(signature)) {
    return "RPC";
  } else if (hexRegex.test(signature)) {
    return "BUNDLE";
  }

  return "UNKNOWN";
}

export function composeExplorerUrl(signature?: string): string | undefined {
  if (!signature) return undefined;

  const detectedBroadcastType = detectBroadcastType(signature);

  return detectedBroadcastType === "BUNDLE"
    ? `https://explorer.jito.wtf/bundle/${signature}`
    : `https://solscan.io/tx/${signature}`;
}

interface handleIndividualFlowErrorParams {
  error: Error;
  actionTxns?: ActionTxns;
  multiStepToast?: MultiStepToastHandle;
}

export function handleIndividualFlowError({
  error,
  actionTxns,
  multiStepToast,
}: handleIndividualFlowErrorParams): never {
  if (error instanceof ProcessTransactionError) {
    const message = extractErrorString(error);
    let failedTxns: ActionTxns | undefined;

    if (error.failedTxs && actionTxns) {
      // Last transaction is always the action transaction
      failedTxns = {
        ...actionTxns,
        transactions: error.failedTxs,
      };
    }

    throw new IndividualFlowError(message, {
      failedTxns,
      multiStepToast,
      retry: true, // TODO: decide which errors we want to allow retries
    });
  } else if (error instanceof SolanaJSONRPCError) {
    throw new IndividualFlowError(error.message, { multiStepToast });
  } else {
    const message = extractErrorString(error);
    throw new IndividualFlowError(message ?? JSON.stringify(error), { multiStepToast });
  }
}

// ------------------------------------------------------------------//
// Individual action flows - non-throwing - for use in UI components //
// ------------------------------------------------------------------//

export async function createAccount({
  mfiClient,
  walletContextState,
  processOpts,
  txOpts,
}: {
  mfiClient: MarginfiClient | null;
  walletContextState?: WalletContextState | WalletContextStateOverride;
  processOpts?: ProcessTransactionsClientOpts;
  txOpts?: TransactionOptions;
}) {
  if (!mfiClient) {
    showErrorToast(STATIC_SIMULATION_ERRORS.NOT_INITIALIZED);
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Creating account", [{ label: "Creating account" }]);
  multiStepToast.start();

  try {
    const squadsOptions = await getMaybeSquadsOptions(walletContextState);
    const marginfiAccount = await mfiClient.createMarginfiAccount(squadsOptions, processOpts, txOpts);

    clearAccountCache(mfiClient.provider.publicKey);

    multiStepToast.setSuccessAndNext();

    return marginfiAccount;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "createAccount",
      wallet: walletContextState?.publicKey?.toBase58(),
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return;
  }
}

export async function createAccountAndDeposit({
  marginfiClient,
  bank,
  amount,
  walletContextState,
  processOpts,
  txOpts,
  multiStepToast,
}: MarginfiActionParams) {
  if (!marginfiClient) {
    showErrorToast(STATIC_SIMULATION_ERRORS.NOT_INITIALIZED);
    return;
  }
  if (!multiStepToast) {
    const steps = getSteps({});

    multiStepToast = new MultiStepToastHandle("Initial deposit", [
      ...steps,
      { label: `Depositing ${amount} ${bank.meta.tokenSymbol}` },
    ]);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  }

  let marginfiAccount: MarginfiAccountWrapper;
  try {
    const squadsOptions = await getMaybeSquadsOptions(walletContextState);
    marginfiAccount = await marginfiClient.createMarginfiAccount(squadsOptions, processOpts, txOpts);

    clearAccountCache(marginfiClient.provider.publicKey);

    multiStepToast.setSuccessAndNext();
  } catch (error: any) {
    console.log(`Error while depositing`);
    console.log(error);

    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "createAccount",
        wallet: walletContextState?.publicKey?.toBase58(),
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns: undefined,
      multiStepToast,
    });
  }

  try {
    const txnSig = await marginfiAccount.deposit(amount, bank.address, {}, processOpts, txOpts);
    multiStepToast.setSuccessAndNext(undefined, txnSig, composeExplorerUrl(txnSig));
    return txnSig;
  } catch (error: any) {
    console.log(`Error while depositing:`);
    console.log(error);
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "deposit",
        wallet: walletContextState?.publicKey?.toBase58(),
        bank: bank.meta.tokenSymbol,
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns: undefined,
      multiStepToast,
    });
  }
}

export async function deposit({
  marginfiAccount,
  marginfiClient,
  bank,
  amount,
  actionTxns,
  processOpts,
  txOpts,
  multiStepToast,
}: MarginfiActionParams) {
  if (!multiStepToast) {
    const steps = getSteps({
      actionTxns,
      customLabels: {
        [TransactionType.DEPOSIT_STAKE]: `Staking and depositing ${amount} ${bank.meta.tokenSymbol}`,
        [TransactionType.DEPOSIT]: `Depositing ${amount} ${bank.meta.tokenSymbol}`,
      },
    });

    multiStepToast = new MultiStepToastHandle("Deposit", steps);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  }

  try {
    let txnSig: string;

    if (actionTxns?.transactions.length === 1 && marginfiClient) {
      txnSig = await marginfiClient.processTransaction(
        actionTxns.transactions[0],
        {
          ...processOpts,
          callback: (index, success, sig, stepsToAdvance) =>
            success && multiStepToast.setSuccessAndNext(stepsToAdvance, sig, composeExplorerUrl(sig)),
        },
        txOpts
      );
    } else if (marginfiAccount) {
      txnSig = await marginfiAccount.deposit(amount, bank.address, {}, processOpts, txOpts);
    } else {
      throw new Error("Marginfi account not ready.");
    }
    multiStepToast.setSuccess(txnSig, composeExplorerUrl(txnSig));
    return txnSig;
  } catch (error: any) {
    console.log(`Error while Depositing`);
    console.log(error);
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "deposit",
        wallet: marginfiAccount?.authority?.toBase58(),
        bank: bank.meta.tokenSymbol,
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns,
      multiStepToast,
    });
  }
}

export async function depositSwap({
  marginfiAccount,
  marginfiClient,
  bank,
  amount,
  actionTxns,
  processOpts,
  txOpts,
  multiStepToast,
  swapBank,
}: ExecuteDepositSwapActionProps) {
  if (!multiStepToast) {
    let customLabel;
    if (
      bank &&
      swapBank &&
      ("info" in swapBank ? swapBank.meta.address.toBase58() : swapBank.address.toBase58()) !== bank.address.toBase58()
    ) {
      customLabel = `Depositing ${amount} ${"info" in swapBank ? swapBank.meta.tokenSymbol : swapBank.symbol} as ${
        bank.meta.tokenSymbol
      }`;
    } else {
      customLabel = `Depositing ${amount} ${bank.meta.tokenSymbol}`;
    }
    const steps = getSteps({
      actionTxns,
      customLabels: {
        [TransactionType.DEPOSIT]: customLabel,
      },
    });

    multiStepToast = new MultiStepToastHandle("Deposit", steps);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  }

  try {
    let sigs: string[] = [];
    if (actionTxns?.transactions?.length && marginfiClient) {
      sigs = await marginfiClient.processTransactions(
        [...actionTxns.transactions],
        {
          ...processOpts,
          callback: (index, success, sig, stepsToAdvance) =>
            success && multiStepToast.setSuccessAndNext(stepsToAdvance, sig, composeExplorerUrl(sig)),
        },
        txOpts
      );
    } else {
      throw new Error("Marginfi account not ready.");
    }

    multiStepToast.setSuccess(sigs[sigs.length - 1], composeExplorerUrl(sigs[sigs.length - 1]));
    return sigs;
  } catch (error: any) {
    console.log(`Error while Depositing`);
    console.log(error);
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "deposit",
        wallet: marginfiAccount?.authority?.toBase58(),
        bank: bank.meta.tokenSymbol,
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns,
      multiStepToast,
    });
  }
}

export async function borrow({
  marginfiClient,
  marginfiAccount,
  bank,
  amount,
  actionTxns,
  processOpts,
  txOpts,
  multiStepToast,
}: MarginfiActionParams) {
  if (!multiStepToast) {
    const steps = getSteps({
      actionTxns,
      customLabels: {
        [TransactionType.BORROW]: `Borrowing ${amount} ${bank.meta.tokenSymbol}`,
      },
    });

    multiStepToast = new MultiStepToastHandle("Borrow", steps);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  }

  try {
    let sigs: string[] = [];

    if (actionTxns?.transactions.length && marginfiClient) {
      sigs = await marginfiClient.processTransactions(
        [...actionTxns.transactions],
        {
          ...processOpts,
          callback: (index, success, sig, stepsToAdvance) =>
            success && multiStepToast.setSuccessAndNext(stepsToAdvance, sig, composeExplorerUrl(sig)),
        },
        txOpts
      );
    } else if (marginfiAccount) {
      sigs = await marginfiAccount.borrow(amount, bank.address, {}, processOpts, txOpts);
    } else {
      throw new Error("Marginfi account not ready.");
    }
    multiStepToast.setSuccess(sigs[sigs.length - 1], composeExplorerUrl(sigs[sigs.length - 1]));
    return sigs;
  } catch (error: any) {
    console.log(`Error while borrowing`);
    console.log(error);

    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "borrow",
        wallet: marginfiAccount?.authority?.toBase58(),
        bank: bank.meta.tokenSymbol,
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns,
      multiStepToast,
    });
  }
}

export async function withdraw({
  marginfiClient,
  marginfiAccount,
  bank,
  amount,
  actionTxns,
  processOpts,
  txOpts,
  multiStepToast,
}: MarginfiActionParams) {
  if (!multiStepToast) {
    const steps = getSteps({
      actionTxns,
      customLabels: {
        [TransactionType.WITHDRAW]: `Withdrawing ${amount} ${bank.meta.tokenSymbol}`,
        [TransactionType.WITHDRAW_ALL]: `Withdrawing ${amount} ${bank.meta.tokenSymbol}`,
        [TransactionType.WITHDRAW_STAKE]: `Unstaking and withdrawing ${amount} ${bank.meta.tokenSymbol}`,
      },
    });

    multiStepToast = new MultiStepToastHandle("Withdraw", steps);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  }

  try {
    let sigs: string[] = [];

    if (actionTxns?.transactions.length && marginfiClient) {
      sigs = await marginfiClient.processTransactions(
        [...actionTxns.transactions],
        {
          ...processOpts,
          callback: (index, success, sig, stepsToAdvance) =>
            success && multiStepToast.setSuccessAndNext(stepsToAdvance, sig, composeExplorerUrl(sig)),
        },
        txOpts
      );
    } else if (marginfiAccount) {
      sigs = await marginfiAccount.withdraw(
        amount,
        bank.address,
        bank.isActive && isWholePosition(bank, amount),
        {},
        processOpts,
        txOpts
      );
    } else {
      throw new Error("Marginfi account not ready.");
    }
    multiStepToast.setSuccess(sigs[sigs.length - 1], composeExplorerUrl(sigs[sigs.length - 1]));
    return sigs;
  } catch (error: any) {
    console.log(`Error while withdrawing`);
    console.log(error);

    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "withdraw",
        wallet: marginfiAccount?.authority?.toBase58(),
        bank: bank.meta.tokenSymbol,
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns,
      multiStepToast,
    });
  }
}

export async function repay({
  marginfiAccount,
  marginfiClient,
  bank,
  amount,
  actionTxns,
  processOpts,
  txOpts,
  multiStepToast,
}: MarginfiActionParams) {
  if (!multiStepToast) {
    const steps = getSteps({
      actionTxns,
      customLabels: {
        [TransactionType.REPAY]: `Repaying ${amount} ${bank.meta.tokenSymbol}`,
      },
    });

    multiStepToast = new MultiStepToastHandle("Repay", steps);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  }

  try {
    let txnSig: string;
    if (actionTxns?.transactions.length && marginfiClient) {
      txnSig =
        (
          await marginfiClient.processTransactions(
            [...actionTxns.transactions],
            {
              ...processOpts,
              callback: (index, success, sig, stepsToAdvance) =>
                success && multiStepToast.setSuccessAndNext(stepsToAdvance, sig, composeExplorerUrl(sig)),
            },
            txOpts
          )
        ).pop() ?? "";
    } else if (marginfiAccount) {
      txnSig = await marginfiAccount.repay(
        amount,
        bank.address,
        bank.isActive && isWholePosition(bank, amount),
        {},
        processOpts,
        txOpts
      );
    } else {
      throw new Error("Marginfi account not ready.");
    }
    multiStepToast.setSuccess(txnSig, composeExplorerUrl(txnSig));
    return txnSig;
  } catch (error: any) {
    console.log(`Error while repaying`);
    console.log(error);
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "repay",
        wallet: marginfiAccount?.authority?.toBase58(),
        bank: bank.meta.tokenSymbol,
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns,
      multiStepToast,
    });
  }
}

interface LoopingFnProps extends LoopingProps {
  marginfiClient: MarginfiClient;
  actionTxns: ActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
}

export async function looping({
  marginfiClient,
  actionTxns,
  processOpts,
  txOpts,
  multiStepToast,
  ...loopingProps
}: LoopingFnProps) {
  if (!marginfiClient) {
    showErrorToast(STATIC_SIMULATION_ERRORS.NOT_INITIALIZED);
    return;
  }

  if (!multiStepToast) {
    const steps = getSteps({
      actionTxns,
      customLabels: {
        [TransactionType.LOOP]: `Looping ${dynamicNumeralFormatter(loopingProps.depositAmount, { minDisplay: 0.01 })} ${
          loopingProps.depositBank.meta.tokenSymbol
        } with ${dynamicNumeralFormatter(loopingProps.borrowAmount.toNumber(), { minDisplay: 0.01 })} ${
          loopingProps.borrowBank.meta.tokenSymbol
        }`,
      },
    });

    multiStepToast = new MultiStepToastHandle("Looping", steps);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  }

  try {
    let sigs: string[] = [];

    if (actionTxns?.transactions.length) {
      sigs = await marginfiClient.processTransactions(
        [...actionTxns.transactions],
        {
          ...processOpts,
          callback: (index, success, sig, stepsToAdvance) =>
            success && multiStepToast.setSuccessAndNext(stepsToAdvance, sig, composeExplorerUrl(sig)),
        },
        txOpts
      );
    } else {
      // TODO fix flashloan builder to use processOpts
      const { transactions } = await loopingBuilder({
        ...loopingProps,
      });
      sigs = await marginfiClient.processTransactions(transactions, processOpts, txOpts);
    }

    multiStepToast.setSuccess(sigs[sigs.length - 1], composeExplorerUrl(sigs[sigs.length - 1]));
    return sigs;
  } catch (error: any) {
    console.log(`Error while looping`);
    console.log(error);
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "looping",
        wallet: loopingProps.marginfiAccount?.authority?.toBase58(),
        bank: loopingProps.borrowBank.meta.tokenSymbol,
        amount: loopingProps.borrowAmount.toString(),
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns,
      multiStepToast,
    });
  }
}

interface TradeFnProps extends LoopingProps {
  marginfiClient: MarginfiClient;
  actionTxns: TradeActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
  tradeSide: "long" | "short";
}

export async function trade({
  marginfiClient,
  actionTxns,
  processOpts,
  txOpts,
  multiStepToast,
  ...tradingProps
}: TradeFnProps) {
  if (!marginfiClient) {
    showErrorToast(STATIC_SIMULATION_ERRORS.NOT_INITIALIZED);
    return;
  }
  const excludedTypes: TransactionType[] = [TransactionType.JUPITER_SWAP];

  if (!multiStepToast) {
    const steps = getSteps({
      actionTxns,
      excludedTypes,
    }); // TODO: update custom labels

    multiStepToast = new MultiStepToastHandle("Trading", [
      ...steps,
      {
        label: `${tradingProps.tradeSide === "long" ? "Longing" : "Shorting"} ${
          tradingProps.tradeSide === "long"
            ? tradingProps.depositBank.meta.tokenSymbol
            : tradingProps.borrowBank.meta.tokenSymbol
        } with ${dynamicNumeralFormatter(tradingProps.depositAmount)} USDC`,
      },
    ]);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  }

  try {
    let sigs: string[] = [];
    if (actionTxns?.transactions.length) {
      sigs = await marginfiClient.processTransactions(
        [...actionTxns.transactions],
        {
          ...processOpts,
          callback: (index, success, sig, stepsToAdvance) => {
            const currentLabel = multiStepToast?.getCurrentLabel();
            if (success && isStepIncluded(currentLabel, excludedTypes)) {
              multiStepToast.setSuccessAndNext(stepsToAdvance, sig, composeExplorerUrl(sig));
            }
          },
        },
        txOpts
      );
    } else {
      // TODO fix flashloan builder to use processOpts
      const { transactions } = await loopingBuilder({
        ...tradingProps,
      });
      sigs = await marginfiClient.processTransactions(transactions, processOpts, txOpts);
    }

    multiStepToast.setSuccess(sigs[sigs.length - 1], composeExplorerUrl(sigs[sigs.length - 1]));
    return sigs;
  } catch (error: any) {
    console.log(`Error while looping`);
    console.log(error);
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "looping",
        wallet: tradingProps.marginfiAccount?.authority?.toBase58(),
        bank: tradingProps.borrowBank.meta.tokenSymbol,
        amount: tradingProps.borrowAmount.toString(),
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns,
      multiStepToast,
    });
  }
}

interface ClosePositionFnProps {
  marginfiClient: MarginfiClient;
  actionTxns: ClosePositionActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
  multiStepToast: MultiStepToastHandle;
}

export async function closePosition({
  marginfiClient,
  actionTxns,
  processOpts,
  txOpts,
  multiStepToast,
}: ClosePositionFnProps) {
  if (!marginfiClient || !actionTxns.transactions.length) {
    throw new Error("Marginfi account not ready.");
  }

  multiStepToast.resume(); // TODO: whats this?

  try {
    let sigs: string[] = [];
    // todo include close transactions in array
    sigs = await marginfiClient.processTransactions(
      [...actionTxns.transactions, ...(actionTxns.closeTransactions ? actionTxns.closeTransactions : [])],
      {
        ...processOpts,
        callback(index, success, sig, stepsToAdvance) {
          const currentLabel = multiStepToast?.getCurrentLabel();
          if (success && currentLabel === "Signing transaction") {
            multiStepToast.setSuccessAndNext(1, sig, composeExplorerUrl(sig));
          }
        },
      }
    );

    multiStepToast.setSuccess(sigs[sigs.length - 1], composeExplorerUrl(sigs[sigs.length - 1]));
    return sigs;
  } catch (error: any) {
    console.log(`Error while closing position`);
    console.log(error);

    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "close_position",
        wallet: marginfiClient.wallet.publicKey?.toBase58(),
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns,
      multiStepToast,
    });
  }
}

interface RepayWithCollatFnProps extends RepayWithCollatProps {
  marginfiClient: MarginfiClient;
  actionTxns: ActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
}

export async function repayWithCollat({
  marginfiClient,
  actionTxns,
  processOpts,
  txOpts,
  multiStepToast,
  ...repayProps
}: RepayWithCollatFnProps) {
  if (!marginfiClient) {
    showErrorToast(STATIC_SIMULATION_ERRORS.NOT_INITIALIZED);
    return;
  }

  if (!repayProps.marginfiAccount) {
    showErrorToast(STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED);
    return;
  }

  if (!multiStepToast) {
    const steps = getSteps({
      actionTxns,
      customLabels: {
        [TransactionType.REPAY_COLLAT]: `Repaying ${dynamicNumeralFormatter(repayProps.repayAmount, {
          minDisplay: 0.01,
        })} ${repayProps.borrowBank.meta.tokenSymbol} with ${dynamicNumeralFormatter(repayProps.withdrawAmount, {
          minDisplay: 0.01,
        })} ${repayProps.depositBank.meta.tokenSymbol}`,
      },
    });

    multiStepToast = new MultiStepToastHandle("Collateral Repay", steps);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  }

  try {
    let sigs: string[] = [];

    if (actionTxns?.transactions.length) {
      sigs = await marginfiClient.processTransactions(
        [...actionTxns.transactions],
        {
          ...processOpts,
          callback: (index, success, sig, stepsToAdvance) =>
            success && multiStepToast.setSuccessAndNext(stepsToAdvance, sig, composeExplorerUrl(sig)),
        },
        txOpts
      );
    } else {
      const { transactions } = await repayWithCollatBuilder(repayProps);

      if (!transactions) {
        throw new Error("Repay with collateral failed.");
      }

      sigs = await marginfiClient.processTransactions(transactions, processOpts, txOpts);
    }
    multiStepToast.setSuccess(sigs[sigs.length - 1], composeExplorerUrl(sigs[sigs.length - 1]));
    return sigs;
  } catch (error: any) {
    console.log(`Error while repaying`);
    console.log(error);
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "repayWithCollat",
        wallet: repayProps.marginfiAccount?.authority?.toBase58(),
        bank: repayProps.borrowBank.meta.tokenSymbol,
        amount: repayProps.repayAmount.toString(),
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns,
      multiStepToast,
    });
  }
}

interface RepayActionProps extends RepayProps {
  marginfiClient: MarginfiClient;
  actionTxns: ActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
}

export async function repayV2({
  marginfiClient,
  actionTxns,
  processOpts,
  txOpts,
  multiStepToast,
  ...repayProps
}: RepayActionProps) {
  if (!multiStepToast) {
    const steps = getSteps({
      actionTxns,
      customLabels: {
        [TransactionType.REPAY]: `Repaying ${dynamicNumeralFormatter(repayProps.repayAmount, { minDisplay: 0.01 })} ${
          repayProps.selectedBank.meta.tokenSymbol
        }`,
        [TransactionType.REPAY_COLLAT]: `Repaying ${dynamicNumeralFormatter(repayProps.repayAmount, {
          minDisplay: 0.01,
        })} ${repayProps.selectedBank.meta.tokenSymbol} with ${dynamicNumeralFormatter(repayProps.withdrawAmount, {
          minDisplay: 0.01,
        })} ${repayProps.selectedSecondaryBank.meta.tokenSymbol}`,
      },
    });

    const customTitle =
      repayProps.selectedBank.address.toBase58() === repayProps.selectedSecondaryBank.address.toBase58()
        ? "Repay"
        : "Collateral Repay";
    multiStepToast = new MultiStepToastHandle(customTitle, steps);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  } // TODO: confirm this is correct

  try {
    let sigs: string[] = [];

    if (actionTxns?.transactions.length) {
      sigs = await marginfiClient.processTransactions(
        [...actionTxns.transactions],
        {
          ...processOpts,
          callback: (index, success, sig, stepsToAdvance) =>
            success && multiStepToast.setSuccessAndNext(stepsToAdvance, sig, composeExplorerUrl(sig)),
        },
        txOpts
      );
    }
    multiStepToast.setSuccess(sigs[sigs.length - 1], composeExplorerUrl(sigs[sigs.length - 1]));
    return sigs;
  } catch (error: any) {
    console.log(`Error while repaying`);
    console.log(error);
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "repayWithCollat",
        wallet: repayProps.marginfiAccount?.authority?.toBase58(),
        bank: repayProps.selectedBank.meta.tokenSymbol,
        amount: repayProps.repayAmount.toString(),
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns,
      multiStepToast,
    });
  }
}

export async function collectRewardsBatch(
  marginfiAccount: MarginfiAccountWrapper,
  bankAddresses: PublicKey[],
  processOpts?: ProcessTransactionsClientOpts,
  txOpts?: TransactionOptions
) {
  const multiStepToast = new MultiStepToastHandle("Collect rewards", [{ label: "Collecting rewards" }]);
  multiStepToast.start();

  try {
    // todo add broadcast type
    const txnSig = await marginfiAccount.withdrawEmissions(bankAddresses, processOpts, txOpts);
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "collectRewardsBatch",
      wallet: marginfiAccount?.authority?.toBase58(),
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while collecting rewards: ${msg}`);
    console.log(error);
    return;
  }
}

export const closeBalance = async ({
  bank,
  marginfiAccount,
  processOpts,
  txOpts,
  multiStepToast,
}: {
  bank: ExtendedBankInfo;
  marginfiAccount: MarginfiAccountWrapper | null | undefined;
  processOpts?: ProcessTransactionsClientOpts;
  txOpts?: TransactionOptions;
  multiStepToast?: MultiStepToastHandle;
}) => {
  if (!marginfiAccount) {
    showErrorToast(STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED);
    return;
  }
  if (!bank.isActive) {
    showErrorToast("No position to close.");
    return;
  }

  if (!multiStepToast) {
    const steps = getSteps({
      actionTxns: undefined,
      customLabels: {
        [TransactionType.CLOSE_POSITION]: `Closing ${bank.position.isLending ? "lending" : "borrow"} balance for ${
          bank.meta.tokenSymbol
        }`,
      },
    });

    multiStepToast = new MultiStepToastHandle("Closing balance", steps);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  }

  try {
    let txnSig = "";
    if (bank.position.isLending) {
      txnSig = (await marginfiAccount.withdraw(0, bank.address, true, {}, processOpts, txOpts)).pop() ?? "";
    } else {
      txnSig = await marginfiAccount.repay(0, bank.address, true, {}, processOpts, txOpts);
    }
    multiStepToast.setSuccessAndNext(undefined, txnSig, composeExplorerUrl(txnSig));
    return txnSig;
  } catch (error: any) {
    console.log(`Error while closing balance`);
    console.log(error);
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "closeBalance",
        wallet: marginfiAccount?.authority?.toBase58(),
        bank: bank.meta.tokenSymbol,
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns: undefined,
      multiStepToast,
    });
  }
};

export async function mintLstStakeToStake({
  marginfiClient,
  priorityFee,
  connection,
  wallet,
  lstData,
  selectedStakingAccount,
  theme,
}: {
  marginfiClient: MarginfiClient;
  priorityFee?: number;
  connection: Connection;
  wallet: Wallet;
  lstData: LstData;
  selectedStakingAccount: StakeData | null;
  theme?: "light" | "dark";
}) {
  const multiStepToast = new MultiStepToastHandle("Mint LST", [{ label: `Minting LST` }]);
  multiStepToast.start();

  try {
    const {
      value: { blockhash },
    } = await connection.getLatestBlockhashAndContext();

    if (!selectedStakingAccount) {
      multiStepToast.setFailed("Route not calculated yet");
      return;
    }

    const { instructions, signers } = await makeDepositStakeToStakePoolIx(
      lstData.accountData,
      lstData.poolAddress,
      wallet.publicKey,
      selectedStakingAccount.validatorVoteAddress,
      selectedStakingAccount.address,
      priorityFee
    );

    const depositMessage = new TransactionMessage({
      instructions: instructions,
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
    });

    const depositTransaction = new VersionedTransaction(depositMessage.compileToV0Message([]));
    depositTransaction.sign(signers);

    const solanaTransaction = addTransactionMetadata(depositTransaction, {
      type: TransactionType.STAKE_TO_STAKE,
    });

    const txnSig = await marginfiClient.processTransaction(solanaTransaction);
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "mintLstStakeToStake",
      wallet: wallet.publicKey.toBase58(),
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while minting lst: ${msg}`);
    console.log(error);
    return;
  }
}

export async function mintLstNative({
  marginfiClient,
  bank,
  amount,
  priorityFee,
  connection,
  wallet,
  lstData,
  theme,
}: {
  marginfiClient: MarginfiClient;
  bank: ExtendedBankInfo;
  amount: number;
  priorityFee?: number;
  connection: Connection;
  wallet: Wallet;
  lstData: LstData;
  theme?: "light" | "dark";
}) {
  const multiStepToast = new MultiStepToastHandle("Mint LST", [
    { label: `Staking ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    const {
      value: { blockhash },
    } = await connection.getLatestBlockhashAndContext();

    const bnAmount = uiToNative(amount, bank.info.state.mintDecimals);

    const { instructions, signers } = await makeDepositSolToStakePoolIx(
      lstData.accountData,
      lstData.poolAddress,
      wallet.publicKey,
      bnAmount,
      undefined,
      undefined,
      undefined,
      priorityFee
    );

    const depositMessage = new TransactionMessage({
      instructions: instructions,
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
    });

    const depositTransaction = new VersionedTransaction(depositMessage.compileToV0Message([]));
    depositTransaction.sign(signers);

    const solanaTransaction = addTransactionMetadata(depositTransaction, {
      type: TransactionType.MINT_LST_NATIVE,
    });

    const txnSig = await marginfiClient.processTransaction(solanaTransaction);
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "mintLstNative",
      wallet: wallet.publicKey.toBase58(),
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while minting lst: ${msg}`);
    console.log(error);
    return;
  }
}

export async function mintLstToken({
  bank,
  amount,
  priorityFee,
  connection,
  wallet,
  quoteResponseMeta,
  isUnstake = false,
  theme,
}: {
  bank: ExtendedBankInfo;
  amount: number;
  priorityFee?: number;
  connection: Connection;
  wallet: Wallet;
  quoteResponseMeta: QuoteResponseMeta | null;
  isUnstake?: boolean;
  theme?: "light" | "dark";
}) {
  const jupiterApiClient = createJupiterApiClient();

  const multiStepToast = isUnstake
    ? new MultiStepToastHandle("Unstake LST", [{ label: `Swapping ${amount} ${bank.meta.tokenSymbol} for SOL` }])
    : new MultiStepToastHandle("Mint LST", [{ label: `Swapping ${amount} ${bank.meta.tokenSymbol} for LST` }]);
  multiStepToast.start();

  try {
    const {
      value: { blockhash },
    } = await connection.getLatestBlockhashAndContext();

    const quote = quoteResponseMeta?.original;
    if (!quote) {
      multiStepToast.setFailed("Route not calculated yet");
      return;
    }

    const swapRequest = {
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: false,
    } as SwapRequest;

    if (priorityFee) {
      swapRequest.prioritizationFeeLamports = priorityFee * LAMPORTS_PER_SOL;
    }

    const { swapTransaction: swapTransactionEncoded, lastValidBlockHeight } = await jupiterApiClient.swapPost({
      swapRequest: swapRequest,
    });
    const swapTransactionBuffer = Buffer.from(swapTransactionEncoded, "base64");
    const swapTransaction = VersionedTransaction.deserialize(swapTransactionBuffer);

    const signedSwapTransaction = await wallet.signTransaction(swapTransaction);
    const swapSig = await connection.sendTransaction(signedSwapTransaction);
    await connection.confirmTransaction(
      {
        blockhash,
        lastValidBlockHeight,
        signature: swapSig,
      },
      "confirmed"
    );

    multiStepToast.setSuccessAndNext();
    return swapSig;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "mintLstToken",
      wallet: wallet.publicKey.toBase58(),
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while minting lst: ${msg}`);
    console.log(error);
    return;
  }
}
