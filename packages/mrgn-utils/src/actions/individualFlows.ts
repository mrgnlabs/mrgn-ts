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

import { ExtendedBankInfo, clearAccountCache } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient, ProcessTransactionsClientOpts } from "@mrgnlabs/marginfi-client-v2";
import { TransactionOptions, Wallet, uiToNative } from "@mrgnlabs/mrgn-common";

import { WalletContextStateOverride } from "../wallet";
import { showErrorToast, MultiStepToastHandle } from "../toasts";
import { extractErrorString, isWholePosition } from "../mrgnUtils";
import { makeDepositSolToStakePoolIx, makeDepositStakeToStakePoolIx } from "../lstUtils";

import { getMaybeSquadsOptions } from "./helpers";
import { LstData, StakeData, MarginfiActionParams, LoopingProps, ActionTxns, RepayWithCollatProps } from "./types";
import { captureSentryException } from "../sentry.utils";
import { loopingBuilder, repayWithCollatBuilder } from "./flashloans";

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
  if (mfiClient === null) {
    showErrorToast({ message: "Marginfi client not ready" });
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
    marginfiAccount = await marginfiClient.createMarginfiAccount(squadsOptions, processOpts, txOpts);

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
    const txnSig = await marginfiAccount.deposit(amount, bank.address, {}, processOpts, txOpts);
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
  actionTxns,
  processOpts,
  txOpts,
}: MarginfiActionParams) {
  const multiStepToast = new MultiStepToastHandle("Deposit", [
    { label: `Depositing ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    let txnSig: string;

    if (actionTxns?.actionTxn && marginfiClient) {
      txnSig = await marginfiClient.processTransaction(actionTxns.actionTxn, processOpts, txOpts);
    } else if (marginfiAccount) {
      txnSig = await marginfiAccount.deposit(amount, bank.address, {}, processOpts, txOpts);
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
  actionTxns,
  processOpts,
  txOpts,
}: MarginfiActionParams) {
  const multiStepToast = new MultiStepToastHandle("Borrow", [
    { label: `Borrowing ${amount} ${bank.meta.tokenSymbol}` },
  ]);

  multiStepToast.start();
  let sigs: string[] = [];

  try {
    if (actionTxns?.actionTxn && marginfiClient) {
      sigs = await marginfiClient.processTransactions(
        [...actionTxns.additionalTxns, actionTxns.actionTxn],
        processOpts,
        txOpts
      );
    } else if (marginfiAccount) {
      sigs = await marginfiAccount.borrow(amount, bank.address, {}, processOpts, txOpts);
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
  actionTxns,
  processOpts,
  txOpts,
}: MarginfiActionParams) {
  const multiStepToast = new MultiStepToastHandle("Withdrawal", [
    { label: `Withdrawing ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  let sigs: string[] = [];

  try {
    if (actionTxns?.actionTxn && marginfiClient) {
      sigs = await marginfiClient.processTransactions(
        [...actionTxns.additionalTxns, actionTxns.actionTxn],
        processOpts,
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
  actionTxns,
  processOpts,
  txOpts,
}: MarginfiActionParams) {
  const multiStepToast = new MultiStepToastHandle("Repayment", [
    { label: `Repaying ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    let txnSig: string;
    if (actionTxns?.actionTxn && marginfiClient) {
      txnSig =
        (
          await marginfiClient.processTransactions(
            [...actionTxns.additionalTxns, actionTxns.actionTxn],
            processOpts,
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

interface LoopingFnProps extends LoopingProps {
  marginfiClient: MarginfiClient;
  actionTxns: ActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
}

export async function looping({ marginfiClient, actionTxns, processOpts, txOpts, ...loopingProps }: LoopingFnProps) {
  if (marginfiClient === null) {
    showErrorToast({ message: "Marginfi client not ready" });
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Looping", [
    {
      label: `Executing looping ${loopingProps.depositBank.meta.tokenSymbol} with ${loopingProps.borrowBank.meta.tokenSymbol}.`,
    },
  ]);
  multiStepToast.start();

  try {
    let sigs: string[] = [];

    if (actionTxns?.actionTxn) {
      sigs = await marginfiClient.processTransactions(
        [...actionTxns.additionalTxns, actionTxns.actionTxn],
        processOpts,
        txOpts
      );
    } else {
      // TODO fix flashloan builder to use processOpts
      const { flashloanTx, feedCrankTxs } = await loopingBuilder({
        marginfiAccount: marginfiAccount!,
        bank,
        depositAmount: amount,
        options: loopingOptions,
        priorityFee: processOpts?.priorityFeeUi ?? 0,
        broadcastType: processOpts?.broadcastType ?? "BUNDLE",
      });
      sigs = await marginfiClient.processTransactions([...feedCrankTxs, flashloanTx], processOpts, txOpts);
    }

    multiStepToast.setSuccessAndNext();
    return sigs;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "looping",
      wallet: marginfiAccount?.authority?.toBase58(),
      bank: bank.meta.tokenSymbol,
      amount: amount.toString(),
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while looping: ${msg}`);
    console.log(error);
    return;
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
  ...repayProps
}: RepayWithCollatFnProps) {
  if (marginfiClient === null) {
    showErrorToast({ message: "Marginfi client not ready" });
    return;
  }

  if (!repayProps.marginfiAccount) {
    showErrorToast({ message: "Marginfi account not ready" });
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Repayment", [{ label: `Executing flashloan repayment` }]);
  multiStepToast.start();

  try {
    let sigs: string[] = [];

    if (actionTxns?.actionTxn) {
      sigs = await marginfiClient.processTransactions(
        [...actionTxns.additionalTxns, actionTxns.actionTxn],
        processOpts,
        txOpts
      );
    } else {
      const { flashloanTx, additionalTxs } = await repayWithCollatBuilder(repayProps);

      if (!flashloanTx) {
        throw new Error("Repay with collateral failed.");
      }

      sigs = await marginfiClient.processTransactions([...additionalTxs, flashloanTx], processOpts, txOpts);
    }
    multiStepToast.setSuccessAndNext();
    return sigs;
  } catch (error: any) {
    const msg = extractErrorString(error);

    captureSentryException(error, msg, {
      action: "repayWithCollat",
      wallet: repayProps.marginfiAccount?.authority?.toBase58(),
      bank: repayProps.borrowBank.meta.tokenSymbol,
      amount: repayProps.repayAmount.toString(),
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
}: {
  bank: ExtendedBankInfo;
  marginfiAccount: MarginfiAccountWrapper | null | undefined;
  processOpts?: ProcessTransactionsClientOpts;
  txOpts?: TransactionOptions;
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
      txnSig = (await marginfiAccount.withdraw(0, bank.address, true, {}, processOpts, txOpts)).pop() ?? "";
    } else {
      txnSig = await marginfiAccount.repay(0, bank.address, true, {}, processOpts, txOpts);
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
