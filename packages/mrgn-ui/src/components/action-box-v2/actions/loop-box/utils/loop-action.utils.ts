import { v4 as uuidv4 } from "uuid";
import {
  ActionMessageType,
  calculateLoopingParams,
  CalculateLoopingProps,
  executeLoopingAction,
  LoopActionTxns,
  ExecuteLoopingActionProps,
  IndividualFlowError,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";

interface ExecuteLendingActionsProps extends ExecuteActionsCallbackProps {
  props: ExecuteLoopingActionProps;
}

export const handleExecuteLoopAction = async ({
  props,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: ExecuteLendingActionsProps) => {
  try {
    setIsLoading(true);
    const attemptUuid = uuidv4();
    captureEvent(`user_loop_initiate`, {
      uuid: attemptUuid,
      depositBank: props.depositBank.meta.tokenSymbol,
      borrowBank: props.borrowBank.meta.tokenSymbol,
      depositAmount: props.depositAmount,
      borrowAmount: props.borrowAmount,
      priorityFee: props.processOpts?.priorityFeeMicro ?? 0,
    });

    const txnSig = await executeLoopingAction(props);

    setIsLoading(false);

    if (txnSig) {
      setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
      captureEvent(`user_loop`, {
        uuid: attemptUuid,
        depositBank: props.depositBank.meta.tokenSymbol,
        borrowBank: props.borrowBank.meta.tokenSymbol,
        depositAmount: props.depositAmount,
        borrowAmount: props.borrowAmount,
        txn: txnSig!,
        priorityFee: props.processOpts?.priorityFeeMicro ?? 0,
      });
    }
  } catch (error) {
    setError(error as IndividualFlowError);
  }
};

export async function calculateLooping(props: CalculateLoopingProps): Promise<LoopActionTxns | ActionMessageType> {
  const params = {
    ...props,
    setupBankAddresses: [props.depositBank.address, props.borrowBank.address],
  };

  const result = await calculateLoopingParams(params);

  return result;
}
