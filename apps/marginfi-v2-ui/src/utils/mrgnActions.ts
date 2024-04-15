import { QuoteResponse, SwapRequest, createJupiterApiClient } from "@jup-ag/api";
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
import { Wallet, processTransaction, uiToNative } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, FEE_MARGIN, ActionType, clearAccountCache } from "@mrgnlabs/marginfi-v2-ui-state";

import { WalletContextStateOverride } from "~/hooks/useWalletContext";
import { LstData, SOL_MINT } from "~/store/lstStore";

import { MultiStepToastHandle, showErrorToast } from "./toastUtils";
import { isWholePosition, extractErrorString } from "./mrgnUtils";
import { StakeData, makeDepositSolToStakePoolIx, makeDepositStakeToStakePoolIx } from "./lstUtils";

export type RepayWithCollatOptions = {
  repayCollatQuote: QuoteResponse;
  repayAmount: number;
  repayBank: ExtendedBankInfo;
  connection: Connection;
  wallet: Wallet;
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

export type LstActionParams = {
  actionMode: ActionType;
  marginfiClient: MarginfiClient;
  amount: number;
  nativeSolBalance: number;
  connection: Connection;
  wallet: Wallet;
  lstData: LstData;
  bank: ExtendedBankInfo | null;
  selectedStakingAccount: StakeData | null;
  quoteResponseMeta: QuoteResponseMeta | null;
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
  let txnSig: string | undefined;

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
      txnSig = await repayWithCollat({ marginfiAccount, bank, amount, priorityFee, options: repayWithCollatOptions });
    } else {
      txnSig = await repay({ marginfiAccount, bank, amount, priorityFee });
    }
  }

  return txnSig;
}

export async function executeLstAction({
  actionMode,
  marginfiClient,
  amount,
  connection,
  wallet,
  lstData,
  bank,
  nativeSolBalance,
  selectedStakingAccount,
  quoteResponseMeta,
  priorityFee,
}: LstActionParams) {
  let txnSig: string | undefined;

  if (nativeSolBalance < FEE_MARGIN) {
    showErrorToast("Not enough sol for fee.");
    return;
  }

  if (!wallet.publicKey) {
    showErrorToast("Wallet not connected.");
    return;
  }

  if (!selectedStakingAccount && !bank) {
    showErrorToast("No token selected.");
    return;
  }

  if (actionMode === ActionType.MintLST) {
    // Stake account selected
    if (selectedStakingAccount) {
      txnSig = await mintLstStakeToStake({
        marginfiClient,
        priorityFee,
        connection,
        selectedStakingAccount,
        wallet,
        lstData,
      });
    }

    if (bank) {
      if (bank.info.state.mint.equals(SOL_MINT)) {
        // SOL selected
        txnSig = await mintLstNative({ marginfiClient, bank, amount, priorityFee, connection, wallet, lstData });
      } else {
        // token selected
        txnSig = await mintLstToken({ bank, amount, priorityFee, connection, wallet, quoteResponseMeta });
      }
    }
    return txnSig;
  } else if (actionMode === ActionType.UnstakeLST) {
    if (bank) {
      txnSig = await mintLstToken({
        bank,
        amount,
        priorityFee,
        connection,
        wallet,
        quoteResponseMeta,
        isUnstake: true,
      });
      return txnSig;
    }
  } else {
    throw new Error("Action not implemented");
  }
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
    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return;
  }

  try {
    const txnSig = await marginfiAccount.deposit(amount, bank.address, priorityFee);
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);
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
    const txnSig = await marginfiAccount.deposit(amount, bank.address, priorityFee);
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);
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
    const txnSig = await marginfiAccount.borrow(amount, bank.address, priorityFee);
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);
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
    const txnSig = await marginfiAccount.withdraw(
      amount,
      bank.address,
      bank.isActive && isWholePosition(bank, amount),
      priorityFee
    );
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);
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
    const txnSig = await marginfiAccount.repay(
      amount,
      bank.address,
      bank.isActive && isWholePosition(bank, amount),
      priorityFee
    );
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);
    multiStepToast.setFailed(msg);
    console.log(`Error while repaying: ${msg}`);
    console.log(error);
    return;
  }
}

export async function repayWithCollat({
  marginfiAccount,
  bank,
  amount,
  options,
  priorityFee,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
  options: RepayWithCollatOptions;
  priorityFee?: number;
}) {
  const jupiterQuoteApi = createJupiterApiClient();
  const multiStepToast = new MultiStepToastHandle("Repayment", [{ label: `Executing flashloan repayment` }]);
  multiStepToast.start();

  try {
    const {
      setupInstructions,
      swapInstruction,
      addressLookupTableAddresses,
      cleanupInstruction,
      tokenLedgerInstruction,
    } = await jupiterQuoteApi.swapInstructionsPost({
      swapRequest: {
        quoteResponse: options.repayCollatQuote,
        userPublicKey: options.wallet.publicKey.toBase58(),
      },
    });

    const setupIxs = setupInstructions.length > 0 ? setupInstructions.map(deserializeInstruction) : [];
    const swapIx = deserializeInstruction(swapInstruction);
    // const swapcleanupIx = cleanupInstruction ? [deserializeInstruction(cleanupInstruction)] : []; **optional**
    // tokenLedgerInstruction **also optional**

    const addressLookupTableAccounts: AddressLookupTableAccount[] = [];
    addressLookupTableAccounts.push(
      ...(await getAdressLookupTableAccounts(options.connection, addressLookupTableAddresses))
    );

    const txnSig = await marginfiAccount.repayWithCollat(
      amount,
      options.repayAmount,
      bank.address,
      options.repayBank.address,
      options.repayBank.isActive && isWholePosition(options.repayBank, options.repayAmount),
      bank.isActive && isWholePosition(bank, amount),
      [...setupIxs, swapIx],
      addressLookupTableAccounts,
      priorityFee
    );
    multiStepToast.setSuccessAndNext();

    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);
    multiStepToast.setFailed(msg);
    console.log(`Error while repaying: ${msg}`);
    console.log(error);
    return;
  }
}

export async function collectRewardsBatch(
  connection: Connection,
  wallet: Wallet,
  marginfiAccount: MarginfiAccountWrapper,
  bankAddresses: PublicKey[]
) {
  const multiStepToast = new MultiStepToastHandle("Collect rewards", [{ label: "Collecting rewards" }]);
  multiStepToast.start();

  try {
    const tx = new Transaction();
    const ixs = [];
    const signers = [];

    for (const bankAddress of bankAddresses) {
      const ix = await marginfiAccount.makeWithdrawEmissionsIx(bankAddress);
      ixs.push(...ix.instructions);
      signers.push(ix.keys);
    }
    tx.add(...ixs);
    await processTransaction(connection, wallet, tx);
    multiStepToast.setSuccessAndNext();
  } catch (error: any) {
    const msg = extractErrorString(error);
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
      txnSig = await marginfiAccount.withdraw(0, bank.address, true, priorityFee);
    } else {
      txnSig = await marginfiAccount.repay(0, bank.address, true, priorityFee);
    }
    multiStepToast.setSuccessAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);
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
    multiStepToast.setFailed(msg);
    console.log(`Error while minting lst: ${msg}`);
    console.log(error);
    return;
  }
}

// ------------------------------------------------------------------//
// Helpers //
// ------------------------------------------------------------------//

async function getMaybeSquadsOptions(walletContextState?: WalletContextState | WalletContextStateOverride) {
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
