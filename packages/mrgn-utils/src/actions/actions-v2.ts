import { TransactionConfigMap, TransactionOptions } from "@mrgnlabs/mrgn-common";
import { ActionTxns, IndividualFlowError, DepositSwapActionTxns } from "./types";
import { depositSwap } from "./individualFlows";
import { toastManager, MultiStepToastController } from "@mrgnlabs/mrgn-toasts";
import { MarginfiClient, ProcessTransactionsClientOpts, ProcessTransactionError } from "@mrgnlabs/marginfi-client-v2";
import { captureSentryException } from "../sentry.utils";
import { SolanaJSONRPCError } from "@solana/web3.js";
import { extractErrorString } from "../mrgnUtils";

async function executeActionWrapper(
  action: (
    txns: ActionTxns,
    onSuccessAndNext: (explorerUrl?: string, signature?: string) => void
  ) => Promise<string | string[]>,
  steps: { label: string }[],
  actionName: string,
  failedTxns: ActionTxns,
  existingToast?: MultiStepToastController
) {
  const toast = existingToast || toastManager.createMultiStepToast(`Processing ${actionName}`, steps);
  if (!existingToast) {
    toast.start();
  } else {
    toast.resetAndStart();
  }

  try {
    const txnSig = await action(failedTxns, (explorerUrl, signature) => {
      toast.successAndNext(explorerUrl, signature);
    });
    toast.success("", typeof txnSig === "string" ? txnSig : txnSig[txnSig.length - 1]); // TODO: clean this up
    return txnSig;
  } catch (error) {
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), { action: actionName }); // TODO: update with more info, move to action function if needed
    }

    if (error instanceof ProcessTransactionError) {
      const message = extractErrorString(error);

      if (error.failedTxs && failedTxns) {
        const updatedFailedTxns = {
          ...failedTxns,
          transactions: error.failedTxs,
        };
        toast.setFailed(message, async () => {
          await executeActionWrapper(action, steps, actionName, updatedFailedTxns, toast);
        });
      } else {
        toast.setFailed(message);
      }
    } else if (error instanceof SolanaJSONRPCError) {
      toast.setFailed(error.message);
    } else {
      const message = extractErrorString(error);
      toast.setFailed(message ?? JSON.stringify(error));
    }
  }
}

interface ExecuteActionProps {
  actionTxns: ActionTxns;
  attemptUuid: string;
  marginfiClient: MarginfiClient;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
  callbacks: {
    captureEvent: (event: string, properties?: Record<string, any>) => void;
  };
}

export interface ExecuteDepositSwapActionPropsV2 extends ExecuteActionProps {
  infoProps: {
    depositToken: string;
    swapToken: string;
    amount: number;
  };
}

export async function ExecuteDepositSwapActionV2(props: ExecuteDepositSwapActionPropsV2) {
  const steps = getDepositSwapSteps(props.actionTxns);

  props.callbacks.captureEvent("user_deposit_swap_initiate", { uuid: props.attemptUuid, ...props.infoProps });

  const action = async (txns: ActionTxns, onSuccessAndNext: (explorerUrl?: string, signature?: string) => void) => {
    return await props.marginfiClient.processTransactions(
      txns.transactions,
      {
        ...props.processOpts,
        callback: (index, success, sig, stepsToAdvance) => {
          success && onSuccessAndNext(undefined, sig); // TODO: add stepsToAdvance & explorerUrl to toast handler
        },
      },
      props.txOpts
    );
  };

  await executeActionWrapper(action, steps, "Deposit", props.actionTxns);

  props.callbacks.captureEvent("user_deposit_swap", { uuid: props.attemptUuid, ...props.infoProps }); // TODO: Does this get executed if an error is thrown? Check
}

function getDepositSwapSteps(actionTxns: ActionTxns) {
  const steps = [
    { label: "Signing Transaction" },
    ...actionTxns.transactions.map((tx) => ({ label: TransactionConfigMap[tx.type].label })),
  ];
  return steps;
}
