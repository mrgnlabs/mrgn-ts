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
import { Wallet, uiToNative } from "@mrgnlabs/mrgn-common";

import { WalletContextStateOverride } from "../wallet";
import { showErrorToast, MultiStepToastHandle } from "../toasts";
import { extractErrorString, isWholePosition } from "../mrgnUtils";
import { makeDepositSolToStakePoolIx, makeDepositStakeToStakePoolIx } from "../lstUtils";

import { loopingBuilder, repayWithCollatBuilder } from "./flashloans";
import { getMaybeSquadsOptions } from "./helpers";
import { RepayWithCollatOptions, LoopingOptions, LstData, StakeData } from "./types";

// ------------------------------------------------------------------//
// Individual action flows - non-throwing - for use in UI components //
// ------------------------------------------------------------------//
export async function createAccount({
  mfiClient,
  walletContextState,
}: {
  mfiClient: MarginfiClient | null;
  walletContextState?: WalletContextState | WalletContextStateOverride;
}) {
  if (mfiClient === null) {
    showErrorToast("Marginfi client not ready");
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Creating account", [{ label: "Creating account" }]);
  multiStepToast.start();

  let marginfiAccount: MarginfiAccountWrapper;
  try {
    const squadsOptions = await getMaybeSquadsOptions(walletContextState);
    marginfiAccount = await mfiClient.createMarginfiAccount(undefined, squadsOptions);

    clearAccountCache(mfiClient.provider.publicKey);

    multiStepToast.setSuccessAndNext();
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return;
  }
}

export async function createAccountAndDeposit({
  mfiClient,
  bank,
  amount,
  walletContextState,
  priorityFee,
}: {
  mfiClient: MarginfiClient | null;
  bank: ExtendedBankInfo;
  amount: number;
  walletContextState?: WalletContextState | WalletContextStateOverride;
  priorityFee?: number;
}) {
  if (mfiClient === null) {
    showErrorToast("Marginfi client not ready");
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
    marginfiAccount = await mfiClient.createMarginfiAccount(undefined, squadsOptions);

    clearAccountCache(mfiClient.provider.publicKey);

    multiStepToast.setSuccessAndNext();
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
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
    Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return;
  }
}

export async function deposit({
  marginfiAccount,
  bank,
  amount,
  priorityFee,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
  priorityFee?: number;
}) {
  const multiStepToast = new MultiStepToastHandle("Deposit", [
    { label: `Depositing ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    const txnSig = await marginfiAccount.deposit(amount, bank.address, { priorityFeeUi: priorityFee });
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
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
}: {
  marginfiClient: MarginfiClient | null;
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
  priorityFee?: number;
  actionTxns?: {
    actionTxn: VersionedTransaction | null;
    feedCrankTxs: VersionedTransaction[];
  };
}) {
  const multiStepToast = new MultiStepToastHandle("Borrow", [
    { label: `Borrowing ${amount} ${bank.meta.tokenSymbol}` },
  ]);

  multiStepToast.start();
  let sigs: string[] = [];

  try {
    if (actionTxns?.actionTxn && marginfiClient) {
      sigs = await marginfiClient.processTransactions([...actionTxns.feedCrankTxs, actionTxns.actionTxn]);
    } else {
      sigs = await marginfiAccount.borrow(amount, bank.address, { priorityFeeUi: priorityFee });
    }
    multiStepToast.setSuccessAndNext();
    return sigs;
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
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
}: {
  marginfiClient: MarginfiClient | null;
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
  priorityFee?: number;
  actionTxns?: {
    actionTxn: VersionedTransaction | null;
    feedCrankTxs: VersionedTransaction[];
  };
}) {
  const multiStepToast = new MultiStepToastHandle("Withdrawal", [
    { label: `Withdrawing ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  let sigs: string[] = [];

  try {
    if (actionTxns?.actionTxn && marginfiClient) {
      sigs = await marginfiClient.processTransactions([...actionTxns.feedCrankTxs, actionTxns.actionTxn]);
    } else {
      sigs = await marginfiAccount.withdraw(amount, bank.address, bank.isActive && isWholePosition(bank, amount), {
        priorityFeeUi: priorityFee,
      });
    }
    multiStepToast.setSuccessAndNext();
    return sigs;
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while withdrawing: ${msg}`);
    console.log(error);
    return;
  }
}

export async function repay({
  marginfiAccount,
  bank,
  amount,
  priorityFee,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
  priorityFee?: number;
}) {
  const multiStepToast = new MultiStepToastHandle("Repayment", [
    { label: `Repaying ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    const txnSig = await marginfiAccount.repay(amount, bank.address, bank.isActive && isWholePosition(bank, amount), {
      priorityFeeUi: priorityFee,
    });
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while repaying: ${msg}`);
    console.log(error);
    return;
  }
}

const getFeeAccount = async (mint: PublicKey) => {
  const referralProgramPubkey = new PublicKey("REFER4ZgmyYx9c6He5XfaTMiGfdLwRnkV4RPp9t9iF3");
  const referralAccountPubkey = new PublicKey("Mm7HcujSK2JzPW4eX7g4oqTXbWYDuFxapNMHXe8yp1B");

  const [feeAccount] = await PublicKey.findProgramAddressSync(
    [Buffer.from("referral_ata"), referralAccountPubkey.toBuffer(), mint.toBuffer()],
    referralProgramPubkey
  );
  return feeAccount.toBase58();
};

export async function looping({
  marginfiClient,
  marginfiAccount,
  bank,
  depositAmount,
  options,
  priorityFee,
  isTxnSplit = false,
}: {
  marginfiClient: MarginfiClient | null;
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  depositAmount: number;
  options: LoopingOptions;
  priorityFee?: number;
  isTxnSplit?: boolean;
}) {
  if (marginfiClient === null) {
    showErrorToast("Marginfi client not ready");
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Looping", [
    { label: `Executing looping ${bank.meta.tokenSymbol} with ${options.loopingBank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    let sigs: string[] = [];

    if (options.loopingTxn) {
      sigs = await marginfiClient.processTransactions([...options.feedCrankTxs, options.loopingTxn]);
    } else {
      const { flashloanTx, feedCrankTxs } = await loopingBuilder({
        marginfiAccount,
        bank,
        depositAmount,
        options,
        priorityFee,
      });
      sigs = await marginfiClient.processTransactions([...feedCrankTxs, flashloanTx]);
    }

    multiStepToast.setSuccessAndNext();
    return sigs;
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
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
  options,
  priorityFee,
  isTxnSplit = false,
}: {
  marginfiClient: MarginfiClient | null;
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
  options: RepayWithCollatOptions;
  priorityFee?: number;
  isTxnSplit?: boolean;
}) {
  if (marginfiClient === null) {
    showErrorToast("Marginfi client not ready");
    return;
  }

  const multiStepToast = new MultiStepToastHandle("Repayment", [{ label: `Executing flashloan repayment` }]);
  multiStepToast.start();

  try {
    let sigs: string[] = [];

    if (options.repayCollatTxn) {
      sigs = await marginfiClient.processTransactions([...options.feedCrankTxs, options.repayCollatTxn]);
    } else {
      const { flashloanTx, feedCrankTxs } = await repayWithCollatBuilder({
        marginfiAccount,
        bank,
        amount,
        options,
        priorityFee,
        isTxnSplit,
      });

      sigs = await marginfiClient.processTransactions([...feedCrankTxs, flashloanTx]);
    }

    multiStepToast.setSuccessAndNext();
    return sigs;
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while repaying: ${msg}`);
    console.log(error);
    return;
  }
}

export async function collectRewardsBatch(
  marginfiAccount: MarginfiAccountWrapper,
  bankAddresses: PublicKey[],
  priorityFee?: number
) {
  const multiStepToast = new MultiStepToastHandle("Collect rewards", [{ label: "Collecting rewards" }]);
  multiStepToast.start();

  try {
    const txnSig = await marginfiAccount.withdrawEmissions(bankAddresses, priorityFee);
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
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
}: {
  bank: ExtendedBankInfo;
  marginfiAccount: MarginfiAccountWrapper | null | undefined;
  priorityFee?: number;
}) => {
  if (!marginfiAccount) {
    showErrorToast("marginfi account not ready.");
    return;
  }
  if (!bank.isActive) {
    showErrorToast("no position to close.");
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
    Sentry.captureException({ message: error });
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
}: {
  marginfiClient: MarginfiClient;
  priorityFee?: number;
  connection: Connection;
  wallet: Wallet;
  lstData: LstData;
  selectedStakingAccount: StakeData | null;
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
    Sentry.captureException({ message: error });
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
}: {
  marginfiClient: MarginfiClient;
  bank: ExtendedBankInfo;
  amount: number;
  priorityFee?: number;
  connection: Connection;
  wallet: Wallet;
  lstData: LstData;
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
    Sentry.captureException({ message: error });
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
}: {
  bank: ExtendedBankInfo;
  amount: number;
  priorityFee?: number;
  connection: Connection;
  wallet: Wallet;
  quoteResponseMeta: QuoteResponseMeta | null;
  isUnstake?: boolean;
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
    Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while minting lst: ${msg}`);
    console.log(error);
    return;
  }
}
