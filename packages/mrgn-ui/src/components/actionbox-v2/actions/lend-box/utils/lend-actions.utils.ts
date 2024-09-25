import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ActionMethod,
  closeBalance,
  executeLendingAction,
  isWholePosition,
  MarginfiActionParams,
} from "@mrgnlabs/mrgn-utils";
import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { v4 as uuidv4 } from "uuid";

interface ExecuteActionsCallbackProps {
  captureEvent: (event: string, properties?: Record<string, any>) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsComplete: (txnSigs: string[]) => void;
  setIsError: (error: string) => void;
}

interface ExecuteLendingActionsProps extends ExecuteActionsCallbackProps {
  params: MarginfiActionParams;
}

export const handleExecuteLendingAction = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setIsError,
}: ExecuteLendingActionsProps) => {
  const { actionType, bank, amount, priorityFee } = params;

  setIsLoading(true);
  const attemptUuid = uuidv4();
  captureEvent(`user_${actionType.toLowerCase()}_initiate`, {
    uuid: attemptUuid,
    tokenSymbol: bank.meta.tokenSymbol,
    tokenName: bank.meta.tokenName,
    amount,
    priorityFee,
  });

  // const { txnSig, error } = await executeLendingAction(params);

  const txnSig = await executeLendingAction(params);

  setIsLoading(false);

  if (txnSig) {
    setIsComplete([...txnSig]);
    captureEvent(`user_${actionType.toLowerCase()}`, {
      uuid: attemptUuid,
      tokenSymbol: bank.meta.tokenSymbol,
      tokenName: bank.meta.tokenName,
      amount: amount,
      txn: txnSig!,
      priorityFee,
    });
  } else {
    setIsError("Transaction not landed");
  }
};

interface HandleCloseBalanceProps extends ExecuteActionsCallbackProps {
  params: {
    bank: ExtendedBankInfo;
    marginfiAccount: MarginfiAccountWrapper | null;
    priorityFee?: number;
  };
}

export const handleExecuteCloseBalance = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setIsError,
}: HandleCloseBalanceProps) => {
  const { bank, marginfiAccount, priorityFee } = params;

  setIsLoading(true);
  const attemptUuid = uuidv4();
  captureEvent(`user_close_balance_initiate`, {
    uuid: attemptUuid,
    tokenSymbol: bank.meta.tokenSymbol,
    tokenName: bank.meta.tokenName,
    amount: 0,
    priorityFee,
  });

  // const { txnSig, error } = await closeBalance({ marginfiAccount: marginfiAccount, bank: bank, priorityFee });
  const txnSig = await closeBalance({ marginfiAccount: marginfiAccount, bank: bank, priorityFee });
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
      priorityFee,
    });
  } else {
    setIsError("Transaction failed to land");
  }
};

export async function calculateLendingTransaction(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo,
  actionMode: ActionType,
  amount: number,
  priorityFee: number
): Promise<
  | {
      actionTxn: VersionedTransaction | Transaction;
      additionalTxns: VersionedTransaction[];
    }
  | ActionMethod
> {
  switch (actionMode) {
    case ActionType.Deposit:
      const depositTx = await marginfiAccount.makeDepositTx(amount, bank.address, { priorityFeeUi: priorityFee });
      return {
        actionTxn: depositTx,
        additionalTxns: [], // bundle tip ix is in depositTx
      };
    case ActionType.Borrow:
      const borrowTxObject = await marginfiAccount.makeBorrowTx(amount, bank.address, {
        createAtas: true,
        wrapAndUnwrapSol: false,
        priorityFeeUi: priorityFee,
      });
      return {
        actionTxn: borrowTxObject.borrowTx,
        additionalTxns: [],
      };
    case ActionType.Withdraw:
      const withdrawTxObject = await marginfiAccount.makeWithdrawTx(
        amount,
        bank.address,
        bank.isActive && isWholePosition(bank, amount)
      );
      return {
        actionTxn: withdrawTxObject.withdrawTx,
        additionalTxns: [],
      };
    case ActionType.Repay:
      const repayTx = await marginfiAccount.makeRepayTx(
        amount,
        bank.address,
        bank.isActive && isWholePosition(bank, amount),
        { priorityFeeUi: priorityFee }
      );
      return {
        actionTxn: repayTx,
        additionalTxns: [], // bundle tip ix is in repayTx
      };
    default:
      throw new Error("Unknown action mode");
  }
}
