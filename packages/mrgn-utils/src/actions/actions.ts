import { WalletContextState } from "@solana/wallet-adapter-react";

import { MarginfiClient, ProcessTransactionsClientOpts } from "@mrgnlabs/marginfi-client-v2";
import { FEE_MARGIN, ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { TransactionOptions, WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { showErrorToast } from "../toasts";
import { MarginfiActionParams, LstActionParams, ActionTxns, RepayWithCollatProps, LoopingProps } from "./types";
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

// ------------------------------------------------------------------//
// Actions //
/**
 * This file contains action functions for executing various marginfi operations.
 * These actions support the execution of different operations such as depositing, borrowing,
 * repaying, withdrawing, looping, and repaying with collateral.
 */
// ------------------------------------------------------------------//

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

  const marginfiAccount = await createAccount({ mfiClient: marginfiClient, walletContextState });
  return marginfiAccount;
}

export async function executeLendingAction(params: MarginfiActionParams) {
  let txnSig: string | string[] | undefined;

  if (params.nativeSolBalance < FEE_MARGIN) {
    showErrorToast("Not enough sol for fee.");
    return;
  }

  if (params.actionType === ActionType.Deposit) {
    if (params.marginfiAccount) {
      txnSig = await deposit(params);
    } else {
      txnSig = await createAccountAndDeposit(params);
    }
    return txnSig;
  }

  if (!params.marginfiAccount) {
    showErrorToast({ message: "Marginfi account not ready." });
    return;
  }


  if (params.actionType === ActionType.Repay) {
    txnSig = await repay(params);
  }

  if (!params.marginfiClient) {
    showErrorToast({ message: "Client not ready." });
    return;
  }

  if (params.actionType === ActionType.Borrow) {
    console.log("borrowing", params);
    txnSig = await borrow(params);
  }

  if (params.actionType === ActionType.Withdraw) {
    txnSig = await withdraw(params);
  }

  return txnSig;
}


export interface ExecuteRepayWithCollatActionProps extends RepayWithCollatProps {
  marginfiClient: MarginfiClient;
  actionTxns: ActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
}


export async function executeRepayWithCollatAction(params: ExecuteRepayWithCollatActionProps) {
  let txnSig: string[] | undefined;
  txnSig = await repayWithCollat(params);
  return txnSig;
}

export interface ExecuteLoopingActionProps extends LoopingProps {
  marginfiClient: MarginfiClient;
  actionTxns: ActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
}


export async function executeLoopingAction(params: ExecuteLoopingActionProps) {
  let txnSig: string[] | undefined;

  if (!params.marginfiAccount) {
    showErrorToast("Marginfi account not ready.");
    return;
  }

  txnSig = await looping(params);

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
  theme = "dark",
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
        theme,
      });
    }

    if (bank) {
      if (bank.info.state.mint.equals(WSOL_MINT)) {
        // SOL selected
        txnSig = await mintLstNative({ marginfiClient, bank, amount, priorityFee, connection, wallet, lstData, theme });
      } else {
        // token selected
        txnSig = await mintLstToken({ bank, amount, priorityFee, connection, wallet, quoteResponseMeta, theme });
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
        theme,
      });
      return txnSig;
    }
  } else {
    throw new Error("Action not implemented");
    // Sentry.captureException({ message: "Action not implemented" });
  }
}
