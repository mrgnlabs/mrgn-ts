import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { closeBalance, executeLendingAction, MarginfiActionParams } from "@mrgnlabs/mrgn-utils";

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

  // if (error) {
  //   setIsError(error);
  // }

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
    // does this ever happen?
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
