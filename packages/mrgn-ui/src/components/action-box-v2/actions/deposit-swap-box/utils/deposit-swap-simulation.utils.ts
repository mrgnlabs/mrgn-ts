import { v4 as uuidv4 } from "uuid";

import { ExecuteDepositSwapActionProps, executeDepositSwapAction, IndividualFlowError } from "@mrgnlabs/mrgn-utils";
import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types/actions.types";

interface _ExecuteDepositSwapActionProps extends ExecuteActionsCallbackProps {
  params: ExecuteDepositSwapActionProps;
}

export const handleExecuteDepositSwapAction = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: _ExecuteDepositSwapActionProps) => {
  try {
    setIsLoading(true);
    const attemptUuid = uuidv4();
    captureEvent(`user_deposit_swap_initiate`, {
      uuid: attemptUuid,
      depositToken: params.bank.meta.tokenSymbol,
      swapToken: params.swapBank
        ? "info" in params.swapBank
          ? params.swapBank.meta.tokenSymbol
          : "NO_SWAP"
        : "NO_SWAP",
      amount: params.amount,
    });

    console.log(params);
    const txnSig = await executeDepositSwapAction({ ...params, swapBank: params.swapBank });

    setIsLoading(false);
    if (txnSig) {
      setIsComplete(txnSig ?? "");
      captureEvent(`user_deposit_swap`, {
        uuid: attemptUuid,
        txn: txnSig,
        depositToken: params.bank.meta.tokenSymbol,
        swapToken: params.swapBank
          ? "info" in params.swapBank
            ? params.swapBank.meta.tokenSymbol
            : "NO_SWAP"
          : "NO_SWAP",
        amount: params.amount,
      });
    }
  } catch (error) {
    setError(error as IndividualFlowError);
  }
};
