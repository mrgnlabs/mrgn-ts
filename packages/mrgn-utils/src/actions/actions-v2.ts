import { TransactionConfigMapV2, TransactionOptions } from "@mrgnlabs/mrgn-common";
import { ActionTxns, IndividualFlowError, DepositSwapActionTxns } from "./types";
import { toastManager, MultiStepToastController } from "@mrgnlabs/mrgn-toasts";
import { MarginfiClient, ProcessTransactionsClientOpts, ProcessTransactionError, MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { captureSentryException } from "../sentry.utils";
import { SolanaJSONRPCError } from "@solana/web3.js";
import { extractErrorString } from "../mrgnUtils";
import { ActionType, FEE_MARGIN } from "@mrgnlabs/marginfi-v2-ui-state"; 
import { STATIC_SIMULATION_ERRORS } from "../errors";
interface ExecuteActionProps {
  actionTxns: ActionTxns;
  attemptUuid: string;
  marginfiClient: MarginfiClient;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
  callbacks: {
    captureEvent?: (event: string, properties?: Record<string, any>) => void;
  };
  
} 

function getSteps(actionTxns: ActionTxns, infoProps: Record<string, any>) {
  return [
    { label: "Signing Transaction" },
    ...actionTxns.transactions.map((tx) => {
      const config = TransactionConfigMapV2[tx.type];

      const message = config.label(infoProps);

      if (config.fallback && message === config.fallback) {
        console.warn(`[getSteps] Missing required fields for transaction type ${tx.type}`);
      }

      return { label: message };
    }),
  ];
}


async function executeActionWrapper(
  action: (
    txns: ActionTxns,
    onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void
  ) => Promise<string >,
  steps: { label: string }[],
  actionName: string,
  failedTxns: ActionTxns,
  existingToast?: MultiStepToastController
) {
  const toast = existingToast || toastManager.createMultiStepToast(`${actionName}`, steps);
  if (!existingToast) {
    toast.start();
  } else {
    toast.resetAndStart();
  }

  try {
    const txnSig = await action(failedTxns, (stepsToAdvance, explorerUrl, signature) => {
      toast.successAndNext(stepsToAdvance ?? 1, explorerUrl, signature);
    });
    toast.success(composeExplorerUrl(txnSig), txnSig);
    return txnSig;
  } catch (error) {
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), { action: actionName })
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

function detectBroadcastType(signature: string): "RPC" | "BUNDLE" | "UNKNOWN" {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const hexRegex = /^[0-9a-fA-F]{64}$/;

  if (base58Regex.test(signature)) {
    return "RPC";
  } else if (hexRegex.test(signature)) {
    return "BUNDLE";
  }

  return "UNKNOWN";
}

function composeExplorerUrl(signature?: string): string | undefined {
  if (!signature) return undefined;

  const detectedBroadcastType = detectBroadcastType(signature);

  return detectedBroadcastType === "BUNDLE"
    ? `https://explorer.jito.wtf/bundle/${signature}`
    : `https://solscan.io/tx/${signature}`;
}


export interface ExecuteDepositSwapActionPropsV2 extends ExecuteActionProps {
  infoProps: {
    depositToken: string;
    swapToken: string;
    depositAmount: string;
    swapAmount: string;
  };
}

export async function ExecuteDepositSwapActionV2(props: ExecuteDepositSwapActionPropsV2) {

  const steps = getSteps(props.actionTxns, {
    amount: props.infoProps.depositAmount,
    token: props.infoProps.depositToken,
    originToken: props.infoProps.swapToken,
    destinationToken: props.infoProps.depositToken,
    originAmount: props.infoProps.swapAmount,
    destinationAmount: props.infoProps.depositAmount, 
  });

  props.callbacks.captureEvent && props.callbacks.captureEvent("user_deposit_swap_initiate", { uuid: props.attemptUuid, ...props.infoProps }); 

  const action = async (txns: ActionTxns, onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void) => {
    const actionResponse = await props.marginfiClient.processTransactions(
      txns.transactions,
      {
        ...props.processOpts,
        callback: (index, success, sig, stepsToAdvance) => {
          success && onSuccessAndNext(stepsToAdvance, composeExplorerUrl(sig), sig); // TODO: add stepsToAdvance & explorerUrl to toast handler. !! DOES NOT WORK with bundles, need to implement stepsToAdvance
        },
      },
      props.txOpts
    );

    return actionResponse[actionResponse.length - 1];
  };

  await executeActionWrapper(action, steps, "Deposit", props.actionTxns);

  props.callbacks.captureEvent && props.callbacks.captureEvent("user_deposit_swap", { uuid: props.attemptUuid, ...props.infoProps });
} // TODO: this does not handle create account. We should handle this. 

export interface ExecuteLendingActionPropsV2 extends ExecuteActionProps {
  nativeSolBalance: number;
  actionType: ActionType;
  infoProps: {
    amount: string;
    token: string;
  };
}


export async function ExecuteLendingActionV2(props: ExecuteLendingActionPropsV2) {

  console.log("props", props);

  if (props.nativeSolBalance < FEE_MARGIN) {

    toastManager.showErrorToast(STATIC_SIMULATION_ERRORS.INSUFICIENT_LAMPORTS); // TODO: fix
    return;
  } // TODO: can move this to wrapper level? Should we always check this? 

  const steps = getSteps(props.actionTxns, {
    amount: props.infoProps.amount,
    token: props.infoProps.token,
  });

  console.log("steps", steps);

  props.callbacks.captureEvent && props.callbacks.captureEvent("user_lending_initiate", { uuid: props.attemptUuid, ...props.infoProps }); 

 const action = async (txns: ActionTxns, onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void) => {
  const actionResponse = await props.marginfiClient.processTransactions(
    txns.transactions,
    {
      ...props.processOpts,
      callback: (index, success, sig, stepsToAdvance) => {
        success && onSuccessAndNext(stepsToAdvance, composeExplorerUrl(sig), sig);
      },
    },
    props.txOpts
  );

  return actionResponse[actionResponse.length - 1];
};

await executeActionWrapper(action, steps, props.actionType, props.actionTxns);

  props.callbacks.captureEvent && props.callbacks.captureEvent("user_lending", { uuid: props.attemptUuid, ...props.infoProps });
  
  
}

export interface ExecuteLoopActionPropsV2 extends ExecuteActionProps {
  infoProps: {
    depositAmount: string;
    depositToken: string;
    borrowAmount: string;
    borrowToken: string;
  };
}


export async function ExecuteLoopActionV2(props: ExecuteLoopActionPropsV2) {

  const steps = getSteps(props.actionTxns, {
    depositAmount: props.infoProps.depositAmount,
    depositToken: props.infoProps.depositToken,
    borrowAmount: props.infoProps.borrowAmount,
    borrowToken: props.infoProps.borrowToken,
  });

  props.callbacks.captureEvent && props.callbacks.captureEvent("user_looping_initiate", { uuid: props.attemptUuid, ...props.infoProps }); 

  const action = async (txns: ActionTxns, onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void) => {
    const actionResponse = await props.marginfiClient.processTransactions(
      txns.transactions,
      {
        ...props.processOpts,
        callback: (index, success, sig, stepsToAdvance) => {
          success && onSuccessAndNext(stepsToAdvance, composeExplorerUrl(sig), sig);
        },
      },
      props.txOpts
    );

    return actionResponse[actionResponse.length - 1];
  };

  await executeActionWrapper(action, steps, "Looping", props.actionTxns);

  props.callbacks.captureEvent && props.callbacks.captureEvent("user_looping", { uuid: props.attemptUuid, ...props.infoProps });
}

export interface ExecuteStakeActionPropsV2 extends ExecuteActionProps {
  infoProps: {
    amount: string;
    token: string;
    actionType: ActionType;
  };
}


export async function ExecuteStakeActionV2(props: ExecuteStakeActionPropsV2) {

  const steps = getSteps(props.actionTxns, {
    amount: props.infoProps.amount,
    token: props.infoProps.token,
  });

  props.callbacks.captureEvent && props.callbacks.captureEvent(`user_${props.infoProps.actionType}_initiate`, { uuid: props.attemptUuid, ...props.infoProps }); 

  const action = async (txns: ActionTxns, onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void) => {
    const actionResponse = await props.marginfiClient.processTransactions(
      txns.transactions,
      {
        ...props.processOpts,
        callback: (index, success, sig, stepsToAdvance) => {
          success && onSuccessAndNext(stepsToAdvance, composeExplorerUrl(sig), sig);
        },
      },
      props.txOpts
    );

    return actionResponse[actionResponse.length - 1];
  };

  await executeActionWrapper(action, steps, props.infoProps.actionType === ActionType.MintLST ? "Staking" : "Unstaking", props.actionTxns);

  props.callbacks.captureEvent && props.callbacks.captureEvent(`user_${props.infoProps.actionType}`, { uuid: props.attemptUuid, ...props.infoProps });
} 

export interface ExecuteRepayActionPropsV2 extends ExecuteActionProps {
  actionType: ActionType;
  infoProps: {
    borrowAmount: string;
    borrowToken: string;
    depositAmount: string;
    depositToken: string;
  } 
}


export async function ExecuteRepayActionV2(props: ExecuteRepayActionPropsV2) {

  const steps = getSteps(props.actionTxns, {
    borrowAmount: props.infoProps.borrowAmount,
    borrowToken: props.infoProps.borrowToken,
    depositAmount: props.infoProps.depositAmount,
    depositToken: props.infoProps.depositToken,
  });

  props.callbacks.captureEvent && props.callbacks.captureEvent(`user_${props.actionType}_initiate`, { uuid: props.attemptUuid, ...props.infoProps }); 

  const action = async (txns: ActionTxns, onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void) => {
    const actionResponse = await props.marginfiClient.processTransactions(
      txns.transactions,
      {
        ...props.processOpts,
        callback: (index, success, sig, stepsToAdvance) => {
          success && onSuccessAndNext(stepsToAdvance, composeExplorerUrl(sig), sig);
        },
      },
      props.txOpts
    );

    return actionResponse[actionResponse.length - 1];
  };

  await executeActionWrapper(action, steps, props.actionType, props.actionTxns);

  props.callbacks.captureEvent && props.callbacks.captureEvent(`user_${props.actionType}`, { uuid: props.attemptUuid, ...props.infoProps });
}
