import * as Sentry from "@sentry/nextjs";
import { v4 as uuidv4 } from "uuid";

import { ActionType, FEE_MARGIN } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { extractErrorString, MultiStepToastHandle, showErrorToast, StakeActionTxns } from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { numeralFormatter } from "@mrgnlabs/mrgn-common";

interface ExecuteStakeActionProps extends ExecuteActionsCallbackProps {
  params: {
    actionTxns: StakeActionTxns;
    marginfiClient: MarginfiClient;
  };
  actionType: ActionType;
  nativeSolBalance: number;
  selectedAccount: MarginfiAccountWrapper;
  originDetails: {
    amount: number;
    tokenSymbol: string;
  };
}

export const handleExecuteLstAction = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setIsError,
  actionType,
  nativeSolBalance,
  selectedAccount,
  originDetails,
}: ExecuteStakeActionProps) => {
  const { actionTxns, marginfiClient } = params;

  setIsLoading(true);
  const attemptUuid = uuidv4();
  captureEvent(`user_${actionType.toLowerCase()}_initiate`, {
    uuid: attemptUuid,
    tokenSymbol: actionType === ActionType.MintLST ? "LST" : "SOL",
    amount: actionTxns.actionQuote?.inAmount,
  });

  const txnSig = await executeLstAction({
    marginfiClient,
    actionTxns,
    actionType,
    nativeSolBalance,
    selectedAccount,
    originDetails,
  });

  setIsLoading(false);

  if (txnSig) {
    setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
    captureEvent(`user_${actionType.toLowerCase()}`, {
      uuid: attemptUuid,
      tokenSymbol: actionType === ActionType.MintLST ? "LST" : "SOL",
      amount: actionTxns.actionQuote?.inAmount,
    });
  } else {
    setIsError("Transaction not landed");
  }
};

const captureException = (error: any, msg: string, tags: Record<string, string | undefined>) => {
  if (msg.includes("User rejected")) return;
  Sentry.setTags({
    ...tags,
    customMessage: msg,
  });
  Sentry.captureException(error);
};

const executeLstAction = async ({
  marginfiClient,
  actionTxns,
  actionType,
  nativeSolBalance,
  selectedAccount,
  originDetails,
}: {
  marginfiClient: MarginfiClient;
  actionTxns: any;
  actionType: ActionType;
  nativeSolBalance: number;
  selectedAccount: MarginfiAccountWrapper;
  originDetails: {
    amount: number;
    tokenSymbol: string;
  };
}) => {
  if (nativeSolBalance < FEE_MARGIN) {
    showErrorToast("Not enough sol for fee.");
    return;
  }

  const multiStepToast = new MultiStepToastHandle(
    actionType === ActionType.MintLST
      ? `Staking ${numeralFormatter(originDetails.amount)} ${originDetails.tokenSymbol}`
      : `Unstaking ${originDetails.amount} ${originDetails.tokenSymbol}`,
    [{ label: `Executing ${actionType === ActionType.MintLST ? "stake" : "unstake"}` }],
    "dark"
  );
  multiStepToast.start();

  try {
    const txnSig = await marginfiClient.processTransactions([actionTxns.actionTxn, ...actionTxns.additionalTxns]);
    multiStepToast.setSuccessAndNext();

    return txnSig;
  } catch (error) {
    const msg = extractErrorString(error);
    multiStepToast.setFailed(msg);
    console.log(`Error while actiontype: ${msg}`);
    console.log(error);

    captureException(error, msg, {
      action: actionType,
      wallet: selectedAccount?.authority?.toBase58(),
    });
    return;
  }
};
