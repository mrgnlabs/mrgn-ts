import { v4 as uuidv4 } from "uuid";

import {
  executeSwapLendAction,
  ExecuteSwapLendActionProps,
  IndividualFlowError,
  MarginfiActionParams,
} from "@mrgnlabs/mrgn-utils";
import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types/actions.types";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

interface _ExecuteSwapLendActionProps extends ExecuteActionsCallbackProps {
  params: ExecuteSwapLendActionProps;
}

export const handleExecuteSwapLendAction = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: _ExecuteSwapLendActionProps) => {
  try {
    setIsLoading(true);
    const attemptUuid = uuidv4();
    captureEvent(`user_swap_lend_initiate`, {
      uuid: attemptUuid,
      depositToken: params.bank.meta.tokenSymbol,
      swapToken: params.swapBank ? params.swapBank.meta.tokenSymbol : "NO_SWAP",
      amount: params.amount,
    });
    const txnSig = await executeSwapLendAction({ ...params, swapBank: params.swapBank });

    setIsLoading(false);
    if (txnSig) {
      setIsComplete(txnSig ?? "");
      captureEvent(`user_swap_lend`, {
        uuid: attemptUuid,
        txn: txnSig,
        depositToken: params.bank.meta.tokenSymbol,
        swapToken: params.swapBank ? params.swapBank.meta.tokenSymbol : "NO_SWAP",
        amount: params.amount,
      });
    }
  } catch (error) {
    setError(error as IndividualFlowError);
  }
};
