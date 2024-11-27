import { v4 as uuidv4 } from "uuid";
import {
  ActionMessageType,
  calculateRepayCollateralParams,
  RepayCollatActionTxns,
  CalculateRepayCollateralProps,
  executeRepayWithCollatAction,
  ExecuteRepayWithCollatActionProps,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";

interface HandleExecuteRepayCollatActionProps extends ExecuteActionsCallbackProps {
  props: ExecuteRepayWithCollatActionProps;
}

export const handleExecuteRepayCollatAction = async ({
  props,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: HandleExecuteRepayCollatActionProps) => {
  try {
    setIsLoading(true);
    const attemptUuid = uuidv4();
    captureEvent(`user_repay_with_collat_initiate`, {
      uuid: attemptUuid,
      depositTokenName: props.depositBank.meta.tokenName,
      borrowTokenName: props.borrowBank.meta.tokenName,
      repayAmount: props.repayAmount,
      withdrawAmount: props.withdrawAmount,
    });

    const txnSig = await executeRepayWithCollatAction(props);

    setIsLoading(false);

    if (txnSig) {
      setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
      captureEvent(`user_repay_with_collat`, {
        uuid: attemptUuid,
        depositTokenName: props.depositBank.meta.tokenName,
        borrowTokenName: props.borrowBank.meta.tokenName,
        repayAmount: props.repayAmount,
        withdrawAmount: props.withdrawAmount,
      });
    }
  } catch (error) {
    // TODO: add type here
    setError(error);
  }
};

export async function calculateRepayCollateral(props: CalculateRepayCollateralProps): Promise<
  | {
      repayCollatObject: RepayCollatActionTxns;
      amount: number;
    }
  | ActionMessageType
> {
  // TODO setup logging again
  // capture("repay_with_collat", {
  //   amountIn: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
  //   firstQuote,
  //   bestQuote: swapQuote,
  //   inputMint: repayBank.info.state.mint.toBase58(),
  //   outputMint: bank.info.state.mint.toBase58(),
  // });

  const result = await calculateRepayCollateralParams(props);

  return result;
}
