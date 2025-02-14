import { TransactionConfigMapV2, TransactionOptions } from "@mrgnlabs/mrgn-common";
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
    toast.success("", typeof txnSig === "string" ? txnSig : txnSig[txnSig.length - 1]); // TODO: clean this up, always return one signature
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
} // TODO: move to types file


export interface ExecuteDepositSwapActionPropsV2 extends ExecuteActionProps {
  infoProps: {
    depositToken: string;
    swapToken: string;
    amount: number;
  };
} // TODO: move to types 

export async function ExecuteDepositSwapActionV2(props: ExecuteDepositSwapActionPropsV2) {

  console.log("props", props);

  const steps = getSteps(props.actionTxns, {
    amount: props.infoProps.amount,
    token: props.infoProps.depositToken,
    originToken: props.infoProps.swapToken,
    destinationToken: props.infoProps.swapToken,
    originAmount: props.infoProps.amount,
    destinationAmount: props.infoProps.amount, // TODO: update this
  });

  console.log("steps", steps);

  props.callbacks.captureEvent("user_deposit_swap_initiate", { uuid: props.attemptUuid, ...props.infoProps }); 

  const action = async (txns: ActionTxns, onSuccessAndNext: (explorerUrl?: string, signature?: string) => void) => {
    return await props.marginfiClient.processTransactions(
      txns.transactions,
      {
        ...props.processOpts,
        callback: (index, success, sig, stepsToAdvance) => {
          success && onSuccessAndNext(undefined, sig); // TODO: add stepsToAdvance & explorerUrl to toast handler. !! DOES NOT WORK with bundles, need to implement stepsToAdvance
        },
      },
      props.txOpts
    );
  };

  await executeActionWrapper(action, steps, "Deposit", props.actionTxns);

  props.callbacks.captureEvent("user_deposit_swap", { uuid: props.attemptUuid, ...props.infoProps }); // TODO: Does this get executed if an error is thrown? 
}

function getSteps(actionTxns: ActionTxns, infoProps: Record<string, any>) {
  console.log("infoProps", infoProps);
  console.log("actionTxns", actionTxns);
  return [
    { label: "Signing Transaction" },
    ...actionTxns.transactions.map((tx) => {
      const config = TransactionConfigMapV2[tx.type];

      // Generate the label using `infoProps`
      const message = config.label(infoProps);

      // Log warning if fallback is used (indicating missing required values)
      if (config.fallback && message === config.fallback) {
        console.warn(`[getSteps] Missing required fields for transaction type ${tx.type}`);
      }

      return { label: message };
    }),
  ];
}