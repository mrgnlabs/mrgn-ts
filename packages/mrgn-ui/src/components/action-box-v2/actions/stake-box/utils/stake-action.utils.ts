import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { StakeActionTxns } from "@mrgnlabs/mrgn-utils";
import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { v4 as uuidv4 } from "uuid";

interface ExecuteStakeActionProps extends ExecuteActionsCallbackProps {
  params: {
    actionTxns: StakeActionTxns;
    marginfiClient: MarginfiClient;
  };
}

export const handleExecuteStakeAction = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setIsError,
}: ExecuteStakeActionProps) => {
  const { actionTxns, marginfiClient } = params;

  setIsLoading(true);
  const attemptUuid = uuidv4();
  // captureEvent(`user_${actionType.toLowerCase()}_initiate`, {
  //   uuid: attemptUuid,
  //   tokenSymbol: bank.meta.tokenSymbol,
  //   tokenName: bank.meta.tokenName,
  //   amount,
  //   priorityFee,
  // });

  if (!actionTxns.actionTxn) return; // TODO: throw error

  const txnSig = await marginfiClient.processTransactions([actionTxns.actionTxn, ...actionTxns.additionalTxns]);

  setIsLoading(false);

  if (txnSig) {
    setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
    //   captureEvent(`user_${actionType.toLowerCase()}`, {
    //     uuid: attemptUuid,
    //     tokenSymbol: bank.meta.tokenSymbol,
    //     tokenName: bank.meta.tokenName,
    //     amount: amount,
    //     txn: txnSig!,
    //     priorityFee,
    //   });
  } else {
    setIsError("Transaction not landed");
  }
};
