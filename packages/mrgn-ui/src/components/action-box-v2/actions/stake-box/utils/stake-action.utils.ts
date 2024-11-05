import * as Sentry from "@sentry/nextjs";
import { v4 as uuidv4 } from "uuid";

import { ActionType, FEE_MARGIN } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import {
  captureSentryException,
  extractErrorString,
  MultiStepToastHandle,
  showErrorToast,
  StakeActionTxns,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { numeralFormatter, nativeToUi, TransactionBroadcastType } from "@mrgnlabs/mrgn-common";

interface ExecuteStakeActionProps extends ExecuteActionsCallbackProps {
  params: {
    actionTxns: StakeActionTxns;
    marginfiClient: MarginfiClient;
    actionType: ActionType;
    nativeSolBalance: number;
    selectedAccount?: MarginfiAccountWrapper;
    originDetails: {
      amount: number;
      tokenSymbol: string;
    };
    broadcastType: TransactionBroadcastType;
  };
}

export const handleExecuteLstAction = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setIsError,
}: ExecuteStakeActionProps) => {
  const { actionTxns, marginfiClient, actionType, nativeSolBalance, originDetails, broadcastType } = params;

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
    originDetails,
    broadcastType,
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

const executeLstAction = async ({
  marginfiClient,
  actionTxns,
  actionType,
  nativeSolBalance,
  originDetails,
  broadcastType,
}: {
  marginfiClient: MarginfiClient;
  actionTxns: StakeActionTxns;
  actionType: ActionType;
  nativeSolBalance: number;
  originDetails: {
    amount: number;
    tokenSymbol: string;
  };
  broadcastType: TransactionBroadcastType;
}) => {
  if (!actionTxns.actionTxn) return;
  if (nativeSolBalance < FEE_MARGIN) {
    showErrorToast("Not enough sol for fee.");
    return;
  }

  const toastLabels =
    actionTxns.actionQuote && actionTxns.additionalTxns.length > 0
      ? [
          `Swapping ${Number(originDetails.amount) < 0.01 ? "<0.01" : numeralFormatter(Number(originDetails.amount))} ${
            originDetails.tokenSymbol
          } `,
          `Staking ${
            nativeToUi(Number(actionTxns.actionQuote.outAmount), 9) < 0.01
              ? "<0.01"
              : numeralFormatter(nativeToUi(Number(actionTxns.actionQuote.outAmount), 9))
          } SOL`,
        ]
      : actionType === ActionType.MintLST
      ? `Staking ${Number(originDetails.amount) < 0.01 ? "<0.01" : numeralFormatter(Number(originDetails.amount))} SOL`
      : `Unstaking ${
          Number(originDetails.amount) < 0.01 ? "<0.01" : numeralFormatter(Number(originDetails.amount))
        } LST`;

  const multiStepToast = new MultiStepToastHandle(actionType === ActionType.MintLST ? `Minting LST` : `Unstaking LST`, [
    {
      label: toastLabels,
    },
  ]);
  multiStepToast.start();

  try {
    const txnSig = await marginfiClient.processTransactions(
      [actionTxns.actionTxn, ...actionTxns.additionalTxns],
      undefined,
      { broadcastType: broadcastType } // todo: add priority fee
    );
    multiStepToast.setSuccessAndNext();

    return txnSig;
  } catch (error) {
    const msg = extractErrorString(error);
    multiStepToast.setFailed(msg);
    console.log(`Error while actiontype: ${msg}`);
    console.log(error);

    const walletAddress = marginfiClient.wallet.publicKey.toBase58();

    captureSentryException(error, msg, {
      action: actionType,
      wallet: walletAddress,
    });
    return;
  }
};
