import { MarginfiAccountWrapper, MarginfiClient, ProcessTransactionError } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, FEE_MARGIN, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { isWholePosition } from "./mrgnUtils";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Wallet, processTransaction } from "@mrgnlabs/mrgn-common";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { WalletContextStateOverride } from "~/hooks/useWalletContext";
import { useAnalytics } from "~/hooks/useAnalytics";
import { MultiStepToastHandle, showErrorToast } from "./toastUtils";

export type MarginfiActionParams = {
  mfiClient: MarginfiClient | null;
  bank: ExtendedBankInfo;
  actionType: ActionType;
  amount: number;
  nativeSolBalance: number;
  marginfiAccount: MarginfiAccountWrapper | null;
  walletContextState?: WalletContextState | WalletContextStateOverride;
};

export async function executeLendingAction({
  mfiClient,
  actionType,
  bank,
  amount,
  nativeSolBalance,
  marginfiAccount,
  walletContextState,
}: MarginfiActionParams) {
  if (nativeSolBalance < FEE_MARGIN) {
    showErrorToast("Not enough sol for fee.");
    return;
  }

  if (actionType === ActionType.Deposit) {
    if (marginfiAccount) {
      await deposit({ marginfiAccount, bank, amount });
    } else {
      await createAccountAndDeposit({ mfiClient, bank, amount, walletContextState });
    }
    return;
  }

  if (!marginfiAccount) {
    showErrorToast("Marginfi account not ready.");
    return;
  }

  if (actionType === ActionType.Borrow) {
    await borrow({ marginfiAccount, bank, amount });
  }

  if (actionType === ActionType.Withdraw) {
    await withdraw({ marginfiAccount, bank, amount });
  }

  if (actionType === ActionType.Repay) {
    await repay({ marginfiAccount, bank, amount });
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
}: {
  mfiClient: MarginfiClient | null;
  bank: ExtendedBankInfo;
  amount: number;
  walletContextState?: WalletContextState | WalletContextStateOverride;
}) {
  if (mfiClient === null) {
    showErrorToast("Marginfi client not ready");
    return;
  }

  const { capture } = useAnalytics();

  const multiStepToast = new MultiStepToastHandle("Initial deposit", [
    { label: "Creating account" },
    { label: `Depositing ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  let marginfiAccount: MarginfiAccountWrapper;
  try {
    const squadsOptions = await getMaybeSquadsOptions(walletContextState);
    marginfiAccount = await mfiClient.createMarginfiAccount(undefined, squadsOptions);
    multiStepToast.setSuccessAndNext();
  } catch (error: any) {
    const msg = extractErrorString(error);
    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return;
  }

  try {
    await marginfiAccount.deposit(amount, bank.address);
    multiStepToast.setSuccessAndNext();
    capture("user_deposit", {
      amount,
      bankAddress: bank.address.toBase58(),
      tokenSymbol: bank.meta.tokenSymbol,
    });
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
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
}) {
  const { capture } = useAnalytics();

  const multiStepToast = new MultiStepToastHandle("Deposit", [
    { label: `Depositing ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    await marginfiAccount.deposit(amount, bank.address);
    multiStepToast.setSuccessAndNext();
    capture("user_deposit", {
      amount,
      bankAddress: bank.address.toBase58(),
      tokenSymbol: bank.meta.tokenSymbol,
    });
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
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
}) {
  const { capture } = useAnalytics();

  const multiStepToast = new MultiStepToastHandle("Borrow", [
    { label: `Borrowing ${amount} ${bank.meta.tokenSymbol}` },
  ]);

  multiStepToast.start();
  try {
    await marginfiAccount.borrow(amount, bank.address);
    multiStepToast.setSuccessAndNext();
    capture("user_borrow", {
      amount,
      bankAddress: bank.address.toBase58(),
      tokenSymbol: bank.meta.tokenSymbol,
    });
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
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
}) {
  const { capture } = useAnalytics();

  const multiStepToast = new MultiStepToastHandle("Withdrawal", [
    { label: `Withdrawing ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    await marginfiAccount.withdraw(amount, bank.address, bank.isActive && isWholePosition(bank, amount));
    multiStepToast.setSuccessAndNext();
    capture("user_withdraw", {
      amount,
      bankAddress: bank.address.toBase58(),
      tokenSymbol: bank.meta.tokenSymbol,
    });
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
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
}) {
  const { capture } = useAnalytics();

  const multiStepToast = new MultiStepToastHandle("Repayment", [
    { label: `Repaying ${amount} ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    await marginfiAccount.repay(amount, bank.address, bank.isActive && isWholePosition(bank, amount));
    multiStepToast.setSuccessAndNext();
    capture("user_repay", {
      amount,
      bankAddress: bank.address.toBase58(),
      tokenSymbol: bank.meta.tokenSymbol,
    });
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
  const { capture } = useAnalytics();
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
    capture("user_collect_rewards", {
      bankAddresses,
    });
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
}: {
  bank: ExtendedBankInfo;
  marginfiAccount: MarginfiAccountWrapper | null | undefined;
}) => {
  if (!marginfiAccount) {
    showErrorToast("marginfi account not ready.");
    return;
  }
  if (!bank.isActive) {
    showErrorToast("no position to close.");
    return;
  }

  const { capture } = useAnalytics();

  const multiStepToast = new MultiStepToastHandle("Closing balance", [
    { label: `Closing ${bank.position.isLending ? "lending" : "borrow"} balance for ${bank.meta.tokenSymbol}` },
  ]);
  multiStepToast.start();

  try {
    if (bank.position.isLending) {
      await marginfiAccount.withdraw(0, bank.address, true);
    } else {
      await marginfiAccount.repay(0, bank.address, true);
    }
    multiStepToast.setSuccessAndNext();
    capture("user_close_balance", {
      positionType: bank.position.isLending ? "lending" : "borrow",
      bankAddress: bank.address.toBase58(),
      tokenSymbol: bank.meta.tokenSymbol,
    });
  } catch (error: any) {
    const msg = extractErrorString(error);
    multiStepToast.setFailed(msg);
    console.log(`Error while closing balance`);
    console.log(error);
  }
};

function extractErrorString(error: any, fallback?: string): string {
  if (error instanceof ProcessTransactionError) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback ?? "Unrecognized error";
}

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
