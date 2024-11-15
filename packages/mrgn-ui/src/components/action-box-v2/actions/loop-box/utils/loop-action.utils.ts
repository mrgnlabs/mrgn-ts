import { v4 as uuidv4 } from "uuid";
import {
  ActionMessageType,
  calculateLoopingParams,
  CalculateLoopingProps,
  executeLoopingAction,
  LoopActionTxns,
  MarginfiActionParams,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";

interface ExecuteLendingActionsProps extends ExecuteActionsCallbackProps {
  params: MarginfiActionParams;
}

export const handleExecuteLoopAction = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setIsError,
}: ExecuteLendingActionsProps) => {
  const { actionType, bank, amount, processOpts } = params;

  setIsLoading(true);
  const attemptUuid = uuidv4();
  captureEvent(`user_${actionType.toLowerCase()}_initiate`, {
    uuid: attemptUuid,
    tokenSymbol: bank.meta.tokenSymbol,
    tokenName: bank.meta.tokenName,
    amount,
    priorityFee: processOpts?.priorityFeeUi ?? 0,
  });

  const txnSig = await executeLoopingAction(params);

  setIsLoading(false);

  if (txnSig) {
    setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
    captureEvent(`user_${actionType.toLowerCase()}`, {
      uuid: attemptUuid,
      tokenSymbol: bank.meta.tokenSymbol,
      tokenName: bank.meta.tokenName,
      amount: amount,
      txn: txnSig!,
      priorityFee: processOpts?.priorityFeeUi ?? 0,
    });
  } else {
    setIsError("Transaction not landed");
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

  const result = await calculateLoopingParams(props);

  return result;
}
