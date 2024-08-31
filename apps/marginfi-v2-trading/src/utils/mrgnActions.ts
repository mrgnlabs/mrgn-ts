import { QuoteResponse, SwapRequest, createJupiterApiClient } from "@jup-ag/api";
import * as Sentry from "@sentry/nextjs";
import {
  AddressLookupTableAccount,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { LUT_PROGRAM_AUTHORITY_INDEX, WSOL_MINT, Wallet, processTransaction, uiToNative } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, FEE_MARGIN, ActionType, clearAccountCache } from "@mrgnlabs/marginfi-v2-ui-state";

import { WalletContextStateOverride } from "~/hooks/useWalletContext";

import { MultiStepToastHandle, showErrorToast } from "./toastUtils";
import { isWholePosition, extractErrorString } from "./mrgnUtils";

export type RepayWithCollatOptions = {
  repayCollatQuote: QuoteResponse;
  feedCrankTxs: VersionedTransaction[];
  repayCollatTxn: VersionedTransaction | null;
  repayAmount: number;
  repayBank: ExtendedBankInfo;
  connection: Connection;
};

export type MarginfiActionParams = {
  mfiClient: MarginfiClient | null;
  bank: ExtendedBankInfo;
  actionType: ActionType;
  amount: number;
  nativeSolBalance: number;
  marginfiAccount: MarginfiAccountWrapper | null;
  repayWithCollatOptions?: RepayWithCollatOptions;
  walletContextState?: WalletContextState | WalletContextStateOverride;
  priorityFee?: number;
};

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
}: MarginfiActionParams) {
  let txnSig: string | string[] | undefined;

  if (nativeSolBalance < FEE_MARGIN) {
    showErrorToast("Not enough sol for fee.");
    return;
  }

  if (actionType === ActionType.Deposit) {
    if (marginfiAccount) {
      txnSig = await deposit({ marginfiAccount, bank, amount, priorityFee });
    } else {
      txnSig = await createAccountAndDeposit({ mfiClient, bank, amount, walletContextState, priorityFee });
    }
    return txnSig;
  }

  if (!marginfiAccount) {
    showErrorToast("Marginfi account not ready.");
    return;
  }

  if (actionType === ActionType.Borrow) {
    txnSig = await borrow({ marginfiAccount, bank, amount, priorityFee });
  }

  if (actionType === ActionType.Withdraw) {
    txnSig = await withdraw({ marginfiAccount, bank, amount, priorityFee });
  }

  if (actionType === ActionType.Repay) {
    if (repayWithCollatOptions) {
      txnSig = await repayWithCollat({
        marginfiClient: mfiClient,
        marginfiAccount,
        bank,
        amount,
        priorityFee,
        options: repayWithCollatOptions,
      });
    } else {
      txnSig = await repay({ marginfiAccount, bank, amount, priorityFee });
    }
  }

  return txnSig;
}

// ------------------------------------------------------------------//
// Individual action flows - non-throwing - for use in UI components //
// ------------------------------------------------------------------//
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
    return txnSig;
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
    const txnSig =
      (
        await marginfiAccount.withdraw(amount, bank.address, bank.isActive && isWholePosition(bank, amount), {
          priorityFeeUi: priorityFee,
        })
      ).pop() ?? "";
    multiStepToast.setSuccessAndNext();
    return txnSig;
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

export const getFeeAccount = (mint: PublicKey) => {
  const referralProgramPubkey = new PublicKey("REFER4ZgmyYx9c6He5XfaTMiGfdLwRnkV4RPp9t9iF3");
  const referralAccountPubkey = new PublicKey("Mm7HcujSK2JzPW4eX7g4oqTXbWYDuFxapNMHXe8yp1B");

  const [feeAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("referral_ata"), referralAccountPubkey.toBuffer(), mint.toBuffer()],
    referralProgramPubkey
  );
  return feeAccount.toBase58();
};

export async function repayWithCollatBuilder({
  marginfiAccount,
  bank,
  amount,
  options,
  priorityFee,
  isTxnSplit,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
  options: RepayWithCollatOptions;
  priorityFee?: number;
  isTxnSplit: boolean;
}) {
  const jupiterQuoteApi = createJupiterApiClient();

  const feeMint =
    options.repayCollatQuote.swapMode === "ExactIn"
      ? options.repayCollatQuote.outputMint
      : options.repayCollatQuote.inputMint;

  // get fee account for original borrow mint
  const feeAccount = getFeeAccount(new PublicKey(feeMint));
  const feeAccountInfo = await options.connection.getAccountInfo(new PublicKey(feeAccount));

  const {
    setupInstructions,
    swapInstruction,
    addressLookupTableAddresses,
    cleanupInstruction,
    tokenLedgerInstruction,
  } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: options.repayCollatQuote,
      userPublicKey: marginfiAccount.authority.toBase58(),
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
      feeAccount: feeAccountInfo ? feeAccount : undefined,
    },
  });

  // const setupIxs = setupInstructions.length > 0 ? setupInstructions.map(deserializeInstruction) : []; //**not optional but man0s smart**
  const swapIx = deserializeInstruction(swapInstruction);
  // const swapcleanupIx = cleanupInstruction ? [deserializeInstruction(cleanupInstruction)] : []; **optional**
  // tokenLedgerInstruction **also optional**

  const swapLUTs: AddressLookupTableAccount[] = [];
  swapLUTs.push(...(await getAdressLookupTableAccounts(options.connection, addressLookupTableAddresses)));

  const { flashloanTx, feedCrankTxs, addressLookupTableAccounts } = await marginfiAccount.makeRepayWithCollatTx(
    amount,
    options.repayAmount,
    bank.address,
    options.repayBank.address,
    options.repayBank.isActive && isWholePosition(options.repayBank, options.repayAmount),
    bank.isActive && isWholePosition(bank, amount),
    [swapIx],
    swapLUTs,
    priorityFee,
    isTxnSplit
  );

  return { flashloanTx, feedCrankTxs, addressLookupTableAccounts };
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

// ------------------------------------------------------------------//
// Helpers //
// ------------------------------------------------------------------//

export async function getMaybeSquadsOptions(walletContextState?: WalletContextState | WalletContextStateOverride) {
  // If the connected wallet is SquadsX, use the ephemeral signer address provided by the wallet to create the marginfi account.
  const adapter = walletContextState?.wallet?.adapter;
  const ephemeralSignerAddress =
    adapter &&
    "standard" in adapter &&
    "fuse:getEphemeralSigners" in adapter.wallet.features &&
    // @ts-ignore
    (await adapter.wallet.features["fuse:getEphemeralSigners"].getEphemeralSigners(1))[0];
  const ephemeralSignerPubkey = ephemeralSignerAddress ? new PublicKey(ephemeralSignerAddress) : undefined;

  return ephemeralSignerPubkey ? { newAccountKey: ephemeralSignerPubkey } : undefined;
}

export function deserializeInstruction(instruction: any) {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((key: any) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instruction.data, "base64"),
  });
}

export async function getAdressLookupTableAccounts(
  connection: Connection,
  keys: string[]
): Promise<AddressLookupTableAccount[]> {
  const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
    keys.map((key) => new PublicKey(key))
  );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, new Array<AddressLookupTableAccount>());
}
