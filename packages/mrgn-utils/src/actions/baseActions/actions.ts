import { PublicKey } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, FEE_MARGIN, ActionType, clearAccountCache } from "@mrgnlabs/marginfi-v2-ui-state";

import { WalletContextStateOverride } from "~/wallet";

import { extractErrorString, isWholePosition } from "../../mrgnUtils";
import { loopingBuilder, repayWithCollatBuilder } from "../flashloans";
import { MarginfiActionParams, LoopingOptions, RepayWithCollatOptions } from "../types";
import { getMaybeSquadsOptions } from "../helpers";
import { MultiStepToastHandle, showErrorToast } from "../../toastUtils";

export async function createAccountAction({
  marginfiClient,
  nativeSolBalance,
  walletContextState,
}: {
  marginfiClient: MarginfiClient | null;
  nativeSolBalance: number;
  walletContextState?: WalletContextState | WalletContextStateOverride;
}) {
  if (nativeSolBalance < FEE_MARGIN) {
    showErrorToast("Not enough sol for fee.");
    return;
  }

  const txnSig = await createAccount({ mfiClient: marginfiClient, walletContextState });

  return txnSig;
}

export async function executeLendingAction({
  mfiClient,
  actionType,
  bank,
  amount,
  nativeSolBalance,
  marginfiAccount,
  walletContextState,
  priorityFee,
  repayWithCollatOptions,
}: MarginfiActionParams): Promise<{
  txnSig?: string | string[];
  error?: any;
}> {
  let txnSig: string | string[] | undefined;

  if (nativeSolBalance < FEE_MARGIN) {
    showErrorToast("Not enough sol for fee.");
    return { error: "Not enough sol for fee." };
  }

  if (actionType === ActionType.Deposit) {
    if (marginfiAccount) {
      return await deposit({ marginfiAccount, bank, amount, priorityFee });
    } else {
      return await createAccountAndDeposit({ mfiClient, bank, amount, walletContextState, priorityFee });
    }
  }

  if (!marginfiAccount) {
    showErrorToast("Marginfi account not ready.");
    return { error: "Marginfi account not ready." };
  }

  if (actionType === ActionType.Borrow) {
    return await borrow({ marginfiAccount, bank, amount, priorityFee });
  }

  if (actionType === ActionType.Withdraw) {
    return await withdraw({ marginfiAccount, bank, amount, priorityFee });
  }

  if (actionType === ActionType.Repay) {
    if (repayWithCollatOptions) {
      return await repayWithCollat({
        marginfiClient: mfiClient,
        marginfiAccount,
        bank,
        amount,
        priorityFee,
        options: repayWithCollatOptions,
      });
    } else {
      return await repay({ marginfiAccount, bank, amount, priorityFee });
    }
  }

  return {};
}

export async function executeLoopingAction({
  mfiClient,
  actionType,
  bank,
  amount,
  marginfiAccount,
  priorityFee,
  loopingOptions,
}: MarginfiActionParams) {
  let txnSig: string[] | undefined;

  if (!marginfiAccount) {
    showErrorToast("Marginfi account not ready.");
    return;
  }

  if (actionType === ActionType.Loop) {
    if (loopingOptions) {
      txnSig = await looping({
        marginfiClient: mfiClient,
        marginfiAccount,
        bank,
        depositAmount: amount,
        priorityFee,
        options: loopingOptions,
      });
    }
  }

  return txnSig;
}

// ------------------------------------------------------------------//
// Individual action flows - non-throwing - for use in UI components //
// ------------------------------------------------------------------//
async function createAccount({
  mfiClient,
  walletContextState,
}: {
  mfiClient: MarginfiClient | null;
  walletContextState?: WalletContextState | WalletContextStateOverride;
}) {
  if (mfiClient === null) {
    showErrorToast("Marginfi client not ready");
    return { error: "Marginfi client not ready" };
  }

  const multiStepToast = new MultiStepToastHandle("Creating account", [{ label: "Creating account" }]);
  multiStepToast.start();

  let marginfiAccount: MarginfiAccountWrapper;
  try {
    const squadsOptions = await getMaybeSquadsOptions(walletContextState);
    marginfiAccount = await mfiClient.createMarginfiAccount(undefined, squadsOptions);

    clearAccountCache(mfiClient.provider.publicKey);

    multiStepToast.setSuccessAndNext();

    return marginfiAccount;
  } catch (error: any) {
    const msg = extractErrorString(error);
    // Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return { error };
  }
}

async function createAccountAndDeposit({
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
    return { error: "Marginfi client not ready" };
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
    // Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return { error };
  }

  try {
    const txnSig = await marginfiAccount.deposit(amount, bank.address, { priorityFeeUi: priorityFee });
    multiStepToast.setSuccessAndNext();
    return { txnSig };
  } catch (error: any) {
    const msg = extractErrorString(error);
    // Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return { error };
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
    return { txnSig };
  } catch (error: any) {
    const msg = extractErrorString(error);
    // Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return { error };
  }
}

export async function borrow({
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
  const multiStepToast = new MultiStepToastHandle("Borrow", [
    { label: `Borrowing ${amount} ${bank.meta.tokenSymbol}` },
  ]);

  multiStepToast.start();
  try {
    const txnSig = await marginfiAccount.borrow(amount, bank.address, { priorityFeeUi: priorityFee });
    multiStepToast.setSuccessAndNext();
    return { txnSig };
  } catch (error: any) {
    const msg = extractErrorString(error);
    // Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while borrowing: ${msg}`);
    console.log(error);
    return { error };
  }
}

export async function withdraw({
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
  const multiStepToast = new MultiStepToastHandle("Withdrawal", [
    { label: `Withdrawing ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    const txnSig = await marginfiAccount.withdraw(
      amount,
      bank.address,
      bank.isActive && isWholePosition(bank, amount),
      { priorityFeeUi: priorityFee }
    );
    multiStepToast.setSuccessAndNext();
    return { txnSig };
  } catch (error: any) {
    const msg = extractErrorString(error);
    // Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while withdrawing: ${msg}`);
    console.log(error);
    return { error };
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
    return { txnSig };
  } catch (error: any) {
    const msg = extractErrorString(error);
    // Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while repaying: ${msg}`);
    console.log(error);
    return { error };
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
      sigs = await marginfiClient.processTransactions([
        ...(options.bundleTipTxn ? [options.bundleTipTxn] : []),
        options.loopingTxn,
      ]);
    } else {
      const { flashloanTx, bundleTipTxn } = await loopingBuilder({
        marginfiAccount,
        bank,
        depositAmount,
        options,
        priorityFee,
        isTxnSplit,
      });
      sigs = await marginfiClient.processTransactions([...(bundleTipTxn ? [bundleTipTxn] : []), flashloanTx]);
    }

    multiStepToast.setSuccessAndNext();
    return sigs;
  } catch (error: any) {
    const msg = extractErrorString(error);
    // Sentry.captureException({ message: error });
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
    return { error: "Marginfi client not ready" };
  }

  const multiStepToast = new MultiStepToastHandle("Repayment", [{ label: `Executing flashloan repayment` }]);
  multiStepToast.start();

  try {
    let txnSig: string[] = [];

    if (options.repayCollatTxn) {
      txnSig = await marginfiClient.processTransactions([
        ...(options.bundleTipTxn ? [options.bundleTipTxn] : []),
        options.repayCollatTxn,
      ]);
    } else {
      const { flashloanTx, bundleTipTxn } = await repayWithCollatBuilder({
        marginfiAccount,
        bank,
        amount,
        options,
        priorityFee,
        isTxnSplit,
      });

      txnSig = await marginfiClient.processTransactions([...(bundleTipTxn ? [bundleTipTxn] : []), flashloanTx]);
    }

    multiStepToast.setSuccessAndNext();
    return { txnSig };
  } catch (error: any) {
    const msg = extractErrorString(error);
    // Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while repaying: ${msg}`);
    console.log(error);
    return { error };
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
    // Sentry.captureException({ message: error });
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
    showErrorToast("Marginfi account not ready.");
    return { error: "Marginfi account not ready." };
  }
  if (!bank.isActive) {
    showErrorToast("No position to close.");
    return { error: "No position to close." };
  }

  const multiStepToast = new MultiStepToastHandle("Closing balance", [
    { label: `Closing ${bank.position.isLending ? "lending" : "borrow"} balance for ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    let txnSig = "";
    if (bank.position.isLending) {
      txnSig = await marginfiAccount.withdraw(0, bank.address, true, { priorityFeeUi: priorityFee });
    } else {
      txnSig = await marginfiAccount.repay(0, bank.address, true, { priorityFeeUi: priorityFee });
    }
    multiStepToast.setSuccessAndNext();
    return { txnSig };
  } catch (error: any) {
    const msg = extractErrorString(error);
    // Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while closing balance`);
    console.log(error);
    return { error };
  }
};
