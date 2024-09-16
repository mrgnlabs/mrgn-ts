import { PublicKey } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { FEE_MARGIN, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { showErrorToast } from "../toasts";
import { MarginfiActionParams, LstActionParams } from "./types";
import { WalletContextStateOverride } from "../wallet";
import {
  deposit,
  repay,
  borrow,
  withdraw,
  looping,
  repayWithCollat,
  createAccountAndDeposit,
  createAccount,
  mintLstNative,
  mintLstToken,
  mintLstStakeToStake,
} from "./individualFlows";

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
  actionTxns,
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

  if (!mfiClient) {
    showErrorToast("Client not ready.");
    return;
  }

  if (actionType === ActionType.Borrow) {
    txnSig = await borrow({ marginfiClient: mfiClient, marginfiAccount, bank, amount, priorityFee, actionTxns });
  }

  if (actionType === ActionType.Withdraw) {
    txnSig = await withdraw({ marginfiClient: mfiClient, marginfiAccount, bank, amount, priorityFee, actionTxns });
  }

  return txnSig;
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
      if (bank.info.state.mint.equals(WSOL_MINT)) {
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
    // Sentry.captureException({ message: "Action not implemented" });
  }
}
