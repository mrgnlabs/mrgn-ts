import { v4 as uuidv4 } from "uuid";
import { IndividualFlowError, executeTradeAction, ExecuteTradeActionProps } from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";

interface ExecuteTradeActionsProps extends ExecuteActionsCallbackProps {
  props: ExecuteTradeActionProps;
}

export const handleExecuteTradeAction = async ({
  props,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: ExecuteTradeActionsProps) => {
  try {
    setIsLoading(true);
    const attemptUuid = uuidv4();
    captureEvent(`user_trade_initiate`, {
      uuid: attemptUuid,
      tokenSymbol: props.borrowBank.meta.tokenSymbol,
      tokenName: props.borrowBank.meta.tokenName,
      amount: props.depositAmount,
      priorityFee: props.processOpts?.priorityFeeMicro ?? 0,
    });

    const txnSig = await executeTradeAction(props);

    setIsLoading(false);

    if (txnSig) {
      setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
      captureEvent(`user_trade`, {
        uuid: attemptUuid,
        tokenSymbol: props.borrowBank.meta.tokenSymbol,
        tokenName: props.borrowBank.meta.tokenName,
        amount: props.depositAmount,
        txn: txnSig!,
        priorityFee: props.processOpts?.priorityFeeMicro ?? 0,
      });
    }
  } catch (error) {
    setError(error as IndividualFlowError);
  }
};
