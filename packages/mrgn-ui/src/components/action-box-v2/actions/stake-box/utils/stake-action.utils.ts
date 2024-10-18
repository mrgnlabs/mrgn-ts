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

  // if actionTxn -> button disabled

  const txnSig = executeLstAction()

  setIsLoading(false);

  if (txnSig) {
    setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
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

const executeLstAction =(/* params die nodig zijn*/)  =>{
  if (params.nativeSolBalance < FEE_MARGIN) {
    showErrorToast("Not enough sol for fee.");
    return;
  }

  const multiStepToast = new MultiStepToastHandle("// actiontype", [{ label: `Executing flashloan repayment` }], theme);
  multiStepToast.start();

  try {

    const txnSig = await marginfiClient.processTransactions([actionTxns.actionTxn, ...actionTxns.additionalTxns]);
    multiStepToast.setSuccessAndNext();

    return txnSig;
  } catch (error) {
    const msg = extractErrorString(error);

    captureException(error, msg, {
      action: //actiontype,
      wallet: marginfiAccount?.authority?.toBase58(),
      bank: bank.meta.tokenSymbol,
      repayWithCollatBank: repayWithCollatOptions?.depositBank.meta.tokenSymbol,
    });

    multiStepToast.setFailed(msg);
    console.log(`Error while actiontype: ${msg}`);
    console.log(error);
    return;
  }

}
