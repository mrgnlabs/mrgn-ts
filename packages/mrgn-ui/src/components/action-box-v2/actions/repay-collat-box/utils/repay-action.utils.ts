import { v4 as uuidv4 } from "uuid";
import {
  ActionMessageType,
  calculateRepayCollateralParams,
  RepayCollatActionTxns,
  CalculateRepayCollateralProps,
  executeRepayWithCollatAction,
  ExecuteRepayWithCollatActionProps,
  IndividualFlowError,
  isWholePosition,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

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
    setError(error as IndividualFlowError);
  }
};

export async function calculateRepayTransaction({
  props,
  actionType,
}: {
  props:
    | {
        marginfiAccount: MarginfiAccountWrapper;
        bank: ExtendedBankInfo;
        actionMode: ActionType;
        amount: number;
      }
    | CalculateRepayCollateralProps;
  actionType: ActionType;
}): Promise<
  | {
      repayCollatObject: RepayCollatActionTxns;
      amount: number;
    }
  | ActionMessageType
> {
  let result:
    | {
        repayCollatObject: RepayCollatActionTxns;
        amount: number;
      }
    | ActionMessageType;
  if (actionType === ActionType.RepayCollat) {
    result = await calculateRepayCollateralParams(props);
  } else if (actionType === ActionType.Repay) {
    const repayTx = await props.marginfiAccount.makeRepayTx(
      props.amount,
      props.bank.address,
      props.bank.isActive && isWholePosition(props.bank, props.amount)
    );
    result = {
      actionTxn: repayTx,
      additionalTxns: [], // bundle tip ix is in repayTx
    };
  }

  return result;
}
