import * as Sentry from "@sentry/nextjs";
import { v4 as uuidv4 } from "uuid";

import { ActionType, ExtendedBankInfo, FEE_MARGIN } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  MarginfiAccountWrapper,
  MarginfiClient,
  ProcessTransactionError,
  ProcessTransactionsClientOpts,
} from "@mrgnlabs/marginfi-client-v2";
import {
  captureSentryException,
  composeExplorerUrl,
  extractErrorString,
  getSteps,
  handleIndividualFlowError,
  IndividualFlowError,
  MultiStepToastHandle,
  showErrorToast,
  StakeActionTxns,
} from "@mrgnlabs/mrgn-utils";

import { ExecuteActionsCallbackProps } from "~/components/action-box-v2/types";
import { nativeToUi, TransactionType, dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { SolanaJSONRPCError } from "@solana/web3.js";

export interface ExecuteLstActionParams {
  actionTxns: StakeActionTxns;
  marginfiClient: MarginfiClient;
  actionType: ActionType;
  nativeSolBalance: number;
  selectedAccount?: MarginfiAccountWrapper;
  originDetails: {
    amount: number;
    tokenSymbol: string;
  };
  processOpts: ProcessTransactionsClientOpts;
  bank: ExtendedBankInfo;

  multiStepToast?: MultiStepToastHandle;
}
interface ExecuteStakeActionProps extends ExecuteActionsCallbackProps {
  params: ExecuteLstActionParams;
}

export const handleExecuteLstAction = async ({
  params,
  captureEvent,
  setIsLoading,
  setIsComplete,
  setError,
}: ExecuteStakeActionProps) => {
  try {
    const { actionTxns, marginfiClient, actionType, nativeSolBalance, originDetails, processOpts } = params;

    setIsLoading(true);
    const attemptUuid = uuidv4();
    captureEvent(`user_${actionType.toLowerCase()}_initiate`, {
      uuid: attemptUuid,
      tokenSymbol: actionType === ActionType.MintLST ? "LST" : "SOL",
      amount: actionTxns.actionQuote?.inAmount,
    });

    const txnSig = await executeLstAction({
      marginfiClient,
      actionTxns,
      actionType,
      nativeSolBalance,
      originDetails,
      processOpts,
    });

    setIsLoading(false);

    if (txnSig) {
      setIsComplete(Array.isArray(txnSig) ? txnSig : [txnSig]);
      captureEvent(`user_${actionType.toLowerCase()}`, {
        uuid: attemptUuid,
        tokenSymbol: actionType === ActionType.MintLST ? "LST" : "SOL",
        amount: actionTxns.actionQuote?.inAmount,
      });
    }
  } catch (error) {
    setError(error as IndividualFlowError);
  }
};

const getStakeSteps = (
  actionTxns: StakeActionTxns,
  originDetails: { amount: number; tokenSymbol: string },
  actionType: ActionType
) => {
  const genericSteps = getSteps({
    actionTxns: actionTxns,
    customLabels: {
      [TransactionType.SWAP_TO_SOL]: `Swapping ${dynamicNumeralFormatter(Number(originDetails.amount))} ${
        originDetails.tokenSymbol
      }`,
      [TransactionType.SOL_TO_LST]:
        actionType === ActionType.MintLST
          ? actionTxns.actionQuote
            ? `Staking ${dynamicNumeralFormatter(nativeToUi(Number(actionTxns?.actionQuote?.outAmount), 9))} SOL`
            : `Staking ${dynamicNumeralFormatter(Number(originDetails.amount))} SOL`
          : `Unstaking ${dynamicNumeralFormatter(Number(originDetails.amount))} LST`,
    },
  });

  return genericSteps;
};

const executeLstAction = async ({
  marginfiClient,
  actionTxns,
  actionType,
  nativeSolBalance,
  originDetails,
  processOpts,
  multiStepToast,
}: {
  marginfiClient: MarginfiClient;
  actionTxns: StakeActionTxns;
  actionType: ActionType;
  nativeSolBalance: number;
  originDetails: {
    amount: number;
    tokenSymbol: string;
  };
  processOpts: ProcessTransactionsClientOpts;
  multiStepToast?: MultiStepToastHandle;
}) => {
  if (!actionTxns.transactions.length) return;
  if (nativeSolBalance < FEE_MARGIN) {
    showErrorToast("Not enough sol for fee.");
    return;
  }

  const steps = getStakeSteps(actionTxns, originDetails, actionType);

  if (!multiStepToast) {
    multiStepToast = new MultiStepToastHandle(actionType === ActionType.MintLST ? `Minting LST` : `Unstaking LST`, [
      ...steps,
    ]);
    multiStepToast.start();
  } else {
    multiStepToast.resetAndStart();
  }

  try {
    const txnSig = await marginfiClient.processTransactions([...actionTxns.transactions], {
      ...processOpts,
      callback: (index, success, sig, stepsToAdvance) =>
        success && multiStepToast.setSuccessAndNext(stepsToAdvance, sig, composeExplorerUrl(sig)),
    });
    multiStepToast.setSuccess(txnSig[txnSig.length - 1], composeExplorerUrl(txnSig[txnSig.length - 1]));

    return txnSig;
  } catch (error: any) {
    console.error(`Error while actiontype: `);
    console.error(error);

    const walletAddress = marginfiClient.wallet.publicKey.toBase58();

    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: actionType,
        wallet: walletAddress,
      });
    }

    handleIndividualFlowError({
      error,
      actionTxns,
      multiStepToast,
    });
  }
};
