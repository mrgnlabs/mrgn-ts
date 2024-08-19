import { MarginfiActionParams } from "@mrgnlabs/mrgn-utils";

import { v4 as uuidv4 } from "uuid";
import { executeLendingAction, capture } from "~/utils";

interface ExecuteLendingActionsProps {
  params: MarginfiActionParams;
  setIsLoading: (isLoading: boolean) => void;
  setIsComplete: (txnSigs: string[], uuid: string) => void;
  setIsError: () => void;
}

export const handleExecuteLendingAction = async ({
  params,
  setIsLoading,
  setIsComplete,
  setIsError,
}: ExecuteLendingActionsProps) => {
  const { actionType, bank, amount, priorityFee } = params;

  setIsLoading(true);
  const attemptUuid = uuidv4();
  capture(`user_${actionType.toLowerCase()}_initiate`, {
    uuid: attemptUuid,
    tokenSymbol: bank.meta.tokenSymbol,
    tokenName: bank.meta.tokenName,
    amount,
    priorityFee,
  });

  const txnSig = await executeLendingAction(params);

  setIsLoading(false);

  if (txnSig) {
    setIsComplete([...txnSig], attemptUuid);
  } else {
    setIsError();
  }
};
