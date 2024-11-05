import { SwapRequest, createJupiterApiClient } from "@jup-ag/api";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import {
  AddressLookupTableAccount,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import * as Sentry from "@sentry/nextjs";

import { ExtendedBankInfo, clearAccountCache } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { TransactionBroadcastType, Wallet, uiToNative } from "@mrgnlabs/mrgn-common";

import { WalletContextStateOverride } from "../wallet";
import { showErrorToast, MultiStepToastHandle } from "../toasts";
import { extractErrorString, isWholePosition } from "../mrgnUtils";
import { makeDepositSolToStakePoolIx, makeDepositStakeToStakePoolIx } from "../lstUtils";

import { loopingBuilder, repayWithCollatBuilder } from "./flashloans";
import { getMaybeSquadsOptions } from "./helpers";
import { RepayWithCollatOptions, LoopingOptions, LstData, StakeData, ActionTxns, MarginfiActionParams } from "./types";
import { captureSentryException } from "../sentry.utils";

// ------------------------------------------------------------------//
// Individual action flows - non-throwing - for use in UI components //
// ------------------------------------------------------------------//
export async function createAccount({
  mfiClient,
  walletContextState,
  theme,
  priorityFee,
  broadcastType,
}: {
  mfiClient: MarginfiClient | null;
  walletContextState?: WalletContextState | WalletContextStateOverride;
  theme?: "light" | "dark";
  priorityFee?: number;
  broadcastType?: TransactionBroadcastType;
}) {
  if (mfiClient === null) {
    showErrorToast({ message: "Marginfi client not ready" });
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Creating account", [{ label: "Creating account" }]);
  multiStepToast.start();

  let marginfiAccount: MarginfiAccountWrapper;
  try {
    const squadsOptions = await getMaybeSquadsOptions(walletContextState);
    
    marginfiAccount = await mfiClient.createMarginfiAccount(undefined, squadsOptions,priorityFee, broadcastType);

    clearAccountCache(mfiClient.provider.publicKey);

    multiStepToast.setSuccessAndNext();
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
  priorityFee,
  broadcastType,
  theme,
}: MarginfiActionParams) {
  if (marginfiClient === null) {
    showErrorToast({ message: "Marginfi client not ready" });
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Initial deposit", [
    { label: "Creating account" },
    { label: `Depositing ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  let marginfiAccount: MarginfiAccountWrapper;
  try {
    const squadsOptions = await getMaybeSquadsOptions(walletContextState);
    marginfiAccount = await marginfiClient.createMarginfiAccount(undefined, squadsOptions, priorityFee, broadcastType);

    clearAccountCache(marginfiClient.provider.publicKey);

    multiStepToast.setSuccessAndNext();
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

  try {
    const txnSig = await marginfiAccount.deposit(amount, bank.address, { priorityFeeUi: priorityFee });
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "deposit",
      wallet: walletContextState?.publicKey?.toBase58(),
      bank: bank.meta.tokenSymbol,
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return;
  }
}

export async function deposit({
  marginfiAccount,
  marginfiClient,
  bank,
  amount,
  priorityFee,
  actionTxns,
  broadcastType,
  theme,
}: MarginfiActionParams) {
  const multiStepToast = new MultiStepToastHandle("Deposit", [
    { label: `Depositing ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    let txnSig: string;

    if (actionTxns?.actionTxn && marginfiClient) {
      txnSig = await marginfiClient.processTransaction(actionTxns.actionTxn);
    } else if (marginfiAccount) {
      txnSig = await marginfiAccount.deposit(amount, bank.address, { priorityFeeUi: priorityFee });
    } else {
      throw new Error("Marginfi account not ready.");
    }
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "deposit",
      wallet: marginfiAccount?.authority?.toBase58(),
      bank: bank.meta.tokenSymbol,
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return;
  }
}

export async function borrow({
  marginfiClient,
  marginfiAccount,
  bank,
  amount,
  priorityFee,
  actionTxns,
  theme,
  broadcastType,
}: MarginfiActionParams) {
  const multiStepToast = new MultiStepToastHandle("Borrow", [
    { label: `Borrowing ${amount} ${bank.meta.tokenSymbol}` },
  ]);

  multiStepToast.start();
  let sigs: string[] = [];

  try {
    if (actionTxns?.actionTxn && marginfiClient) {
      sigs = await marginfiClient.processTransactions([...actionTxns.additionalTxns, actionTxns.actionTxn]);
    } else if (marginfiAccount) {
      sigs = await marginfiAccount.borrow(amount, bank.address, { priorityFeeUi: priorityFee });
    } else {
      throw new Error("Marginfi account not ready.");
    }
    multiStepToast.setSuccessAndNext();
    return sigs;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "borrow",
      wallet: marginfiAccount?.authority?.toBase58(),
      bank: bank.meta.tokenSymbol,
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while borrowing: ${msg}`);
    console.log(error);
    return;
  }
}

export async function withdraw({
  marginfiClient,
  marginfiAccount,
  bank,
  amount,
  priorityFee,
  actionTxns,
  theme,
  broadcastType,
}: MarginfiActionParams) {
  const multiStepToast = new MultiStepToastHandle("Withdrawal", [
    { label: `Withdrawing ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  let sigs: string[] = [];

  try {
    if (actionTxns?.actionTxn && marginfiClient) {
      sigs = await marginfiClient.processTransactions([...actionTxns.additionalTxns, actionTxns.actionTxn]);
    } else if (marginfiAccount) {
      sigs = await marginfiAccount.withdraw(amount, bank.address, bank.isActive && isWholePosition(bank, amount), {
        priorityFeeUi: priorityFee,
      });
    } else {
      throw new Error("Marginfi account not ready.");
    }
    multiStepToast.setSuccessAndNext();
    return sigs;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "withdraw",
      wallet: marginfiAccount?.authority?.toBase58(),
      bank: bank.meta.tokenSymbol,
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while withdrawing: ${msg}`);
    console.log(error);
    return;
  }
}

export async function repay({
  marginfiAccount,
  marginfiClient,
  bank,
  amount,
  priorityFee,
  actionTxns,
  broadcastType,
  theme,
}: MarginfiActionParams) {
  const multiStepToast = new MultiStepToastHandle("Repayment", [
    { label: `Repaying ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    let txnSig: string;
    if (actionTxns?.actionTxn && marginfiClient) {
      txnSig = await marginfiClient.processTransaction(actionTxns.actionTxn);
    } else if (marginfiAccount) {
      txnSig = await marginfiAccount.repay(amount, bank.address, bank.isActive && isWholePosition(bank, amount), {
        priorityFeeUi: priorityFee,
      });
    } else {
      throw new Error("Marginfi account not ready.");
    }
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "repay",
      wallet: marginfiAccount?.authority?.toBase58(),
      bank: bank.meta.tokenSymbol,
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while repaying: ${msg}`);
    console.log(error);
    return;
  }
}

export async function looping({
  marginfiClient,
  marginfiAccount,
  bank,
  amount,
  actionTxns,
  loopingOptions,
  priorityFee,
  broadcastType,
  theme,
}: MarginfiActionParams & { isTxnSplit?: boolean }) {
  if (marginfiClient === null) {
    showErrorToast({ message: "Marginfi client not ready" });
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Looping", [
    { label: `Executing looping ${bank.meta.tokenSymbol} with ${loopingOptions?.loopingBank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    let sigs: string[] = [];

    if (actionTxns?.actionTxn) {
      sigs = await marginfiClient.processTransactions([...actionTxns.additionalTxns, actionTxns.actionTxn]);
    } else if (loopingOptions) {
      console.log("loopingOptions", loopingOptions);
      if (loopingOptions?.loopingTxn) {
        sigs = await marginfiClient.processTransactions([...loopingOptions.feedCrankTxs, loopingOptions.loopingTxn]);
      } else {
        const { flashloanTx, feedCrankTxs } = await loopingBuilder({
          marginfiAccount: marginfiAccount!,
          bank,
          depositAmount: amount,
          options: loopingOptions,
          priorityFee,
          broadcastType,
        });
        sigs = await marginfiClient.processTransactions([...feedCrankTxs, flashloanTx]);
      }
    } else {
      throw new Error("Invalid options provided for looping, please contact support.");
    }

    multiStepToast.setSuccessAndNext();
    return sigs;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "looping",
      wallet: marginfiAccount?.authority?.toBase58(),
      bank: bank.meta.tokenSymbol,
      loopingBank: loopingOptions?.loopingBank.meta.tokenSymbol,
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while looping: ${msg}`);
    console.log(error);
    return;
  }
}

export async function repayWithCollat({
  marginfiClient,
  marginfiAccount,
  bank,
  amount,
  repayWithCollatOptions,
  priorityFee,
  broadcastType,
  theme,
  actionTxns,
}: MarginfiActionParams & { isTxnSplit?: boolean }) {
  if (marginfiClient === null) {
    showErrorToast({ message: "Marginfi client not ready" });
    return;
  }

  if (!marginfiAccount) {
    showErrorToast({ message: "Marginfi account not ready" });
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Repayment", [{ label: `Executing flashloan repayment` }]);
  multiStepToast.start();

  try {
    let sigs: string[] = [];

    if (actionTxns?.actionTxn) {
      sigs = await marginfiClient.processTransactions([...actionTxns.additionalTxns, actionTxns.actionTxn]);
    } else if (repayWithCollatOptions) {
      // deprecated
      if (repayWithCollatOptions.repayCollatTxn) {
        sigs = await marginfiClient.processTransactions([
          ...repayWithCollatOptions.feedCrankTxs,
          repayWithCollatOptions.repayCollatTxn,
        ]);
      } else {
        const { flashloanTx, feedCrankTxs } = await repayWithCollatBuilder({
          marginfiAccount,
          bank,
          amount,
          options: repayWithCollatOptions,
          priorityFee,
          broadcastType,
        });

        sigs = await marginfiClient.processTransactions([...feedCrankTxs, flashloanTx]);
      }
    } else {
      throw new Error("Invalid options provided for repay, please contact support.");
    }
    multiStepToast.setSuccessAndNext();
    return sigs;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "repayWithCollat",
      wallet: marginfiAccount?.authority?.toBase58(),
      bank: bank.meta.tokenSymbol,
      repayWithCollatBank: repayWithCollatOptions?.depositBank.meta.tokenSymbol,
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while repaying: ${msg}`);
    console.log(error);
    return;
  }
}

export async function collectRewardsBatch(
  marginfiAccount: MarginfiAccountWrapper,
  bankAddresses: PublicKey[],
  priorityFee?: number,
  theme?: "light" | "dark"
) {
  const multiStepToast = new MultiStepToastHandle("Collect rewards", [{ label: "Collecting rewards" }]);
  multiStepToast.start();

  try {
    const txnSig = await marginfiAccount.withdrawEmissions(bankAddresses, priorityFee);
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
  priorityFee,
  broadcastType,
  theme,
}: {
  bank: ExtendedBankInfo;
  marginfiAccount: MarginfiAccountWrapper | null | undefined;
  priorityFee?: number;
  broadcastType?: TransactionBroadcastType;
  theme?: "light" | "dark";
}) => {
  if (!marginfiAccount) {
    showErrorToast({ message: "marginfi account not ready." });
    return;
  }
  if (!bank.isActive) {
    showErrorToast({ message: "no position to close." });
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Closing balance", [
    { label: `Closing ${bank.position.isLending ? "lending" : "borrow"} balance for ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    let txnSig = "";
    if (bank.position.isLending) {
      txnSig = (await marginfiAccount.withdraw(0, bank.address, true, { priorityFeeUi: priorityFee })).pop() ?? "";
    } else {
      txnSig = await marginfiAccount.repay(0, bank.address, true, { priorityFeeUi: priorityFee });
    }
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "closeBalance",
      wallet: marginfiAccount?.authority?.toBase58(),
      bank: bank.meta.tokenSymbol,
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while closing balance`);
    console.log(error);
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

    const txnSig = await marginfiClient.processTransaction(depositTransaction);
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

    const txnSig = await marginfiClient.processTransaction(depositTransaction);
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
