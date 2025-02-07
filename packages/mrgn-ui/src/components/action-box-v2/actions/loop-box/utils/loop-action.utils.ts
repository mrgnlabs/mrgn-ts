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
      tokenSymbol: props.borrowBank.meta.tokenSymbol,
      tokenName: props.borrowBank.meta.tokenName,
      amount: props.depositAmount,
      priorityFee: props.processOpts?.priorityFeeMicro ?? 0,
    });

    const txnSig = await executeLoopingAction(props);

    setIsLoading(false);

    if (txnSig) {
      setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
      captureEvent(`user_loop`, {
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

export async function calculateLooping(props: CalculateLoopingProps): Promise<LoopActionTxns | ActionMessageType> {
  // TODO setup logging again
  // capture("looper", {
  //   amountIn: uiToNative(amount, loopBank.info.state.mintDecimals).toNumber(),
  //   firstQuote,
  //   bestQuote: swapQuote,
  //   inputMint: loopBank.info.state.mint.toBase58(),
  //   outputMint: bank.info.state.mint.toBase58(),
  // });

  const params = {
    ...props,
    setupBankAddresses: [props.depositBank.address, props.borrowBank.address],
  };

  const result = await calculateLoopingParams(params);

  return result;
}
