import { QuoteResponse } from "@jup-ag/api";
import { v4 as uuidv4 } from "uuid";
import { Connection, VersionedTransaction } from "@solana/web3.js";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { TransactionBroadcastType } from "@mrgnlabs/mrgn-common";
import {
  ActionMessageType,
  calculateLoopingParams,
  executeLoopingAction,
  LoopingObject,
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

export async function calculateLooping(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo, // deposit
  loopBank: ExtendedBankInfo, // borrow
  targetLeverage: number,
  amount: number,
  slippageBps: number,
  connection: Connection,
  priorityFee: number,
  platformFeeBps: number,
  broadcastType: TransactionBroadcastType
): Promise<LoopingObject | ActionMessageType> {
  // TODO setup logging again
  // capture("looper", {
  //   amountIn: uiToNative(amount, loopBank.info.state.mintDecimals).toNumber(),
  //   firstQuote,
  //   bestQuote: swapQuote,
  //   inputMint: loopBank.info.state.mint.toBase58(),
  //   outputMint: bank.info.state.mint.toBase58(),
  // });

  const result = await calculateLoopingParams({
    marginfiAccount,
    depositBank: bank,
    borrowBank: loopBank,
    targetLeverage,
    amount,
    slippageBps,
    connection,
    priorityFee,
    platformFeeBps,
    broadcastType,
  });

  return result;
}
