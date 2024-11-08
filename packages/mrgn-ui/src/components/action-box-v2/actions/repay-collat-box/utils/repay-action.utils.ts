import { v4 as uuidv4 } from "uuid";
import {
  ActionMessageType,
  calculateRepayCollateralParams,
  executeLendingAction,
  MarginfiActionParams,
  RepayCollatActionTxns,
  RepayWithCollatProps,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";

interface ExecuteLendingActionsProps extends ExecuteActionsCallbackProps {
  params: MarginfiActionParams;
}

export const handleExecuteRepayCollatAction = async ({
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
    priorityFee: processOpts?.priorityFeeUi,
  });

  const txnSig = await executeLendingAction(params);

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

interface CalculateRepayCollateralProps extends RepayWithCollatProps {
  slippageBps: number;
  platformFeeBps: number;
}

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
