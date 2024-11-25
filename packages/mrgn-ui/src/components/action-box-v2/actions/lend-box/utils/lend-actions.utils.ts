import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { v4 as uuidv4 } from "uuid";

import { MarginfiAccountWrapper, ProcessTransactionsClientOpts } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { SolanaTransaction, TransactionBroadcastType } from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  closeBalance,
  executeLendingAction,
  isWholePosition,
  MarginfiActionParams,
  MultiStepToastHandle,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";

interface ExecuteLendingActionsProps extends ExecuteActionsCallbackProps {
  params: MarginfiActionParams;
}

export const handleExecuteLendingAction = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: ExecuteLendingActionsProps) => {
  try {
    const { actionType, bank, amount, processOpts } = params;

    setIsLoading(true);
    const attemptUuid = uuidv4();
    captureEvent(`user_${actionType.toLowerCase()}_initiate`, {
      uuid: attemptUuid,
      tokenSymbol: bank.meta.tokenSymbol,
      tokenName: bank.meta.tokenName,
      amount,
      processOpts: processOpts?.priorityFeeMicro,
    });

    const txnSig = await executeLendingAction(params);

    setIsLoading(false);

    if (txnSig) {
      setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
      captureEvent(`user_${actionType.toLowerCase()}`, {
        uuid: attemptUuid,
        tokenSymbol: bank.meta.tokenSymbol,
        tokenName: bank.meta.tokenName,
        amount: amount,
        txn: txnSig!,
        priorityFee: processOpts?.priorityFeeMicro,
      });
    }
  } catch (error) {
    setError(error);
  }
};

interface HandleCloseBalanceProps extends ExecuteActionsCallbackProps {
  params: {
    bank: ExtendedBankInfo;
    marginfiAccount: MarginfiAccountWrapper | null;
    processOpts?: ProcessTransactionsClientOpts;
  };
}

export const handleExecuteCloseBalance = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: HandleCloseBalanceProps) => {
  const { bank, marginfiAccount, processOpts } = params;

  setIsLoading(true);
  const attemptUuid = uuidv4();
  captureEvent(`user_close_balance_initiate`, {
    uuid: attemptUuid,
    tokenSymbol: bank.meta.tokenSymbol,
    tokenName: bank.meta.tokenName,
    amount: 0,
    priorityFee: processOpts?.priorityFeeMicro,
  });

  // const { txnSig, error } = await closeBalance({ marginfiAccount: marginfiAccount, bank: bank, priorityFee });
  const txnSig = await closeBalance({ marginfiAccount: marginfiAccount, bank: bank, processOpts });
  setIsLoading(false);

  // if (error) {
  //   setIsError(error);
  // }

  if (txnSig) {
    setIsComplete([...txnSig]);
    captureEvent(`user_close_balance`, {
      uuid: attemptUuid,
      tokenSymbol: bank.meta.tokenSymbol,
      tokenName: bank.meta.tokenName,
      amount: 0,
      txn: txnSig!,
      priorityFee: processOpts?.priorityFeeMicro,
    });
  } else {
    setError("Transaction failed to land");
  }
};

export async function calculateLendingTransaction(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo,
  actionMode: ActionType,
  amount: number
): Promise<
  | {
      actionTxn: SolanaTransaction;
      additionalTxns: SolanaTransaction[];
    }
  | ActionMessageType
> {
  switch (actionMode) {
    case ActionType.Deposit:
      const depositTx = await marginfiAccount.makeDepositTx(amount, bank.address);
      return {
        actionTxn: depositTx,
        additionalTxns: [], // bundle tip ix is in depositTx
      };
    case ActionType.Borrow:
      const borrowTxObject = await marginfiAccount.makeBorrowTx(amount, bank.address, {
        createAtas: true,
        wrapAndUnwrapSol: false,
      });
      return {
        actionTxn: borrowTxObject.borrowTx,
        additionalTxns: borrowTxObject.feedCrankTxs,
      };
    case ActionType.Withdraw:
      const withdrawTxObject = await marginfiAccount.makeWithdrawTx(
        amount,
        bank.address,
        bank.isActive && isWholePosition(bank, amount)
      );
      return {
        actionTxn: withdrawTxObject.withdrawTx,
        additionalTxns: withdrawTxObject.feedCrankTxs,
      };
    case ActionType.Repay:
      const repayTx = await marginfiAccount.makeRepayTx(
        amount,
        bank.address,
        bank.isActive && isWholePosition(bank, amount)
      );
      return {
        actionTxn: repayTx,
        additionalTxns: [], // bundle tip ix is in repayTx
      };
    default:
      throw new Error("Unknown action mode");
  }
}
