import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { StakeActionTxns } from "@mrgnlabs/mrgn-utils";
import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { v4 as uuidv4 } from "uuid";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

interface ExecuteStakeActionProps extends ExecuteActionsCallbackProps {
  params: {
    actionTxns: StakeActionTxns;
    marginfiClient: MarginfiClient;
  };
  actionType: ActionType;
}

export const handleExecuteLstAction = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setIsError,
  actionType,
}: ExecuteStakeActionProps) => {
  const { actionTxns, marginfiClient } = params;

  setIsLoading(true);
  const attemptUuid = uuidv4();
  captureEvent(`user_${actionType.toLowerCase()}_initiate`, {
    uuid: attemptUuid,
    tokenSymbol: actionType === ActionType.MintLST ? "LST" : "SOL",
    amount: actionTxns.actionQuote?.inAmount,
  });

  if (!actionTxns.actionTxn) {
    setIsError("Transaction not landed");
    setIsLoading(false);
    return;
  }

  const txnSig = await marginfiClient.processTransactions([actionTxns.actionTxn, ...actionTxns.additionalTxns]);

  setIsLoading(false);

  if (txnSig) {
    setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
    captureEvent(`user_${actionType.toLowerCase()}`, {
      uuid: attemptUuid,
      tokenSymbol: actionType === ActionType.MintLST ? "LST" : "SOL",
      amount: actionTxns.actionQuote?.inAmount,
      txn: txnSig!,
    });
  } else {
    setIsError("Transaction not landed");
  }
};
