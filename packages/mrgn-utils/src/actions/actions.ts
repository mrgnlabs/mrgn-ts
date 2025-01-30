import { WalletContextState } from "@solana/wallet-adapter-react";

import { MarginfiClient, ProcessTransactionsClientOpts } from "@mrgnlabs/marginfi-client-v2";
import { FEE_MARGIN, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { TransactionOptions, WalletToken, WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { MultiStepToastHandle, showErrorToast } from "../toasts";
import {
  MarginfiActionParams,
  LstActionParams,
  ActionTxns,
  RepayWithCollatProps,
  LoopingProps,
  TradeActionTxns,
  ClosePositionActionTxns,
  DepositSwapActionTxns,
  RepayProps,
  RepayActionTxns,
} from "./types";
import { WalletContextStateOverride } from "../wallet";
import {
  deposit,
  repay,
  borrow,
  withdraw,
  looping,
  trade,
  repayWithCollat,
  createAccountAndDeposit,
  createAccount,
  mintLstNative,
  mintLstToken,
  mintLstStakeToStake,
  closePosition,
  depositSwap,
  repayV2,
} from "./individualFlows";
import { STATIC_SIMULATION_ERRORS } from "../errors";

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
    showErrorToast(STATIC_SIMULATION_ERRORS.INSUFICIENT_LAMPORTS);
    return;
  }

  const marginfiAccount = await createAccount({ mfiClient: marginfiClient, walletContextState });
  return marginfiAccount;
}

export async function executeLendingAction(params: MarginfiActionParams) {
  let txnSig: string | string[] | undefined;

  if (params.nativeSolBalance < FEE_MARGIN) {
    showErrorToast(STATIC_SIMULATION_ERRORS.INSUFICIENT_LAMPORTS);
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
    showErrorToast(STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED);
    return;
  }

  if (params.actionType === ActionType.Repay) {
    txnSig = await repay(params);
  }

  if (!params.marginfiClient) {
    showErrorToast(STATIC_SIMULATION_ERRORS.NOT_INITIALIZED);
    return;
  }

  if (params.actionType === ActionType.Borrow) {
    txnSig = await borrow(params);
  }

  if (params.actionType === ActionType.Withdraw) {
    txnSig = await withdraw(params);
  }

  return txnSig;
}

export interface ExecuteRepayActionProps extends RepayProps {
  marginfiClient: MarginfiClient;
  actionTxns: RepayActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
}

export async function executeRepayAction(params: ExecuteRepayActionProps) {
  let txnSig: string[] | undefined;
  txnSig = await repayV2(params);
  return txnSig;
}

export interface ExecuteRepayWithCollatActionProps extends RepayWithCollatProps {
  marginfiClient: MarginfiClient;
  actionTxns: ActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;

  multiStepToast?: MultiStepToastHandle;
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
    showErrorToast(STATIC_SIMULATION_ERRORS.ACCOUNT_NOT_INITIALIZED);
    return;
  }

  txnSig = await looping(params);

  return txnSig;
}

export interface ExecuteTradeActionProps extends LoopingProps {
  marginfiClient: MarginfiClient;
  actionTxns: TradeActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
  tradeSide: "long" | "short";
}

export async function executeTradeAction(params: ExecuteTradeActionProps) {
  let txnSig: string[] | undefined;

  txnSig = await trade(params);

  return txnSig;
}

export interface ExecuteDepositSwapActionProps extends MarginfiActionParams {
  swapBank: ExtendedBankInfo | WalletToken | null;
  actionTxns: DepositSwapActionTxns;
}

export async function executeDepositSwapAction(params: ExecuteDepositSwapActionProps) {
  let txnSig: string[] | undefined;

  txnSig = await depositSwap(params);

  return txnSig;
}

export interface ExecuteClosePositionActionProps {
  marginfiClient: MarginfiClient;
  actionTxns: ClosePositionActionTxns;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
  multiStepToast: MultiStepToastHandle;
}

export async function executeClosePositionAction(params: ExecuteClosePositionActionProps) {
  let txnSig: string[] | undefined;

  txnSig = await closePosition(params);

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
    showErrorToast(STATIC_SIMULATION_ERRORS.INSUFICIENT_LAMPORTS);
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
