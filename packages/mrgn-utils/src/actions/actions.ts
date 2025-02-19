import { SolanaJSONRPCError } from "@solana/web3.js";

import { TransactionConfigMap, TransactionOptions } from "@mrgnlabs/mrgn-common";
import { toastManager, MultiStepToastController } from "@mrgnlabs/mrgn-toasts";
import { MarginfiClient, ProcessTransactionsClientOpts, ProcessTransactionError } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, FEE_MARGIN } from "@mrgnlabs/marginfi-v2-ui-state";

import { ActionTxns } from "./types";
import { composeExplorerUrl } from "./helpers";
import { STATIC_SIMULATION_ERRORS } from "../errors";
import { captureSentryException } from "../sentry.utils";
import { extractErrorString } from "../mrgnUtils";

// ------------------------------------------------------------------//
// Actions //
/**
 * This file contains action functions for executing various marginfi operations.
 * These actions support the execution of different operations such as depositing, borrowing,
 * repaying, withdrawing, looping, and repaying with collateral.
 */
// ------------------------------------------------------------------//

export interface ExecuteActionProps {
  actionTxns: ActionTxns;
  attemptUuid: string;
  marginfiClient: MarginfiClient;
  processOpts: ProcessTransactionsClientOpts;
  txOpts: TransactionOptions;
  callbacks: {
    captureEvent?: (event: string, properties?: Record<string, any>) => void;
    onComplete?: () => void | null;
  };
  nativeSolBalance?: number;
}

function getSteps(actionTxns: ActionTxns, infoProps: Record<string, any>) {
  return [
    { label: "Sign Transaction" },
    ...actionTxns.transactions.map((tx) => {
      const config = TransactionConfigMap[tx.type];

      const message = config.label(infoProps);

      if (config.fallback && message === config.fallback) {
        console.warn(`[getSteps] Missing required fields for transaction type ${tx.type}`);
      }

      return { label: message };
    }),
  ];
}

async function executeActionWrapper(props: {
  action: (
    txns: ActionTxns,
    onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void
  ) => Promise<string>;
  steps: { label: string }[];
  actionName: string;
  txns: ActionTxns;
  existingToast?: MultiStepToastController;
  nativeSolBalance?: number;
  onComplete?: () => void;
}) {
  const { action, steps, actionName, txns, existingToast, nativeSolBalance, onComplete } = props;

  if (nativeSolBalance && nativeSolBalance < FEE_MARGIN) {
    toastManager.showErrorToast(STATIC_SIMULATION_ERRORS.INSUFICIENT_LAMPORTS);
    return;
  }

  const toast = existingToast || toastManager.createMultiStepToast(`${actionName}`, steps);
  if (!existingToast) {
    toast.start();
  } else {
    toast.resetAndStart();
  }

  try {
    const txnSig = await action(txns, (stepsToAdvance, explorerUrl, signature) => {
      toast.successAndNext(stepsToAdvance ?? 1, explorerUrl, signature);
    });
    toast.success(composeExplorerUrl(txnSig), txnSig);
    onComplete && onComplete();
    return txnSig;
  } catch (error) {
    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), { action: actionName });
    }

    if (error instanceof ProcessTransactionError) {
      const message = extractErrorString(error);

      if (error.failedTxs && txns) {
        const updatedFailedTxns = {
          ...txns,
          transactions: error.failedTxs,
        };
        toast.setFailed(message, async () => {
          await executeActionWrapper({ ...props, txns: updatedFailedTxns, existingToast: toast });
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

export interface ExecuteDepositSwapActionProps extends ExecuteActionProps {
  infoProps: {
    depositToken: string;
    swapToken: string;
    depositAmount: string;
    swapAmount: string;
  };
}

export async function ExecuteDepositSwapAction(props: ExecuteDepositSwapActionProps) {
  const steps = getSteps(props.actionTxns, {
    amount: props.infoProps.depositAmount,
    token: props.infoProps.depositToken,
    originToken: props.infoProps.swapToken,
    destinationToken: props.infoProps.depositToken,
    originAmount: props.infoProps.swapAmount,
    destinationAmount: props.infoProps.depositAmount,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent("user_deposit_swap_initiate", { uuid: props.attemptUuid, ...props.infoProps });

  const action = async (
    txns: ActionTxns,
    onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void
  ) => {
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

  await executeActionWrapper({
    action,
    steps,
    actionName: "Deposit",
    txns: props.actionTxns,
    nativeSolBalance: props.nativeSolBalance,
    onComplete: props.callbacks.onComplete,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent("user_deposit_swap", { uuid: props.attemptUuid, ...props.infoProps });
} // TODO: this does not handle create account. We should handle this.

export interface ExecuteLendingActionProps extends ExecuteActionProps {
  actionType: ActionType;
  infoProps: {
    amount: string;
    token: string;
  };
}

export async function ExecuteLendingAction(props: ExecuteLendingActionProps) {
  const steps = getSteps(props.actionTxns, {
    amount: props.infoProps.amount,
    token: props.infoProps.token,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent("user_lending_initiate", { uuid: props.attemptUuid, ...props.infoProps });

  const action = async (
    txns: ActionTxns,
    onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void
  ) => {
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

  await executeActionWrapper({
    action,
    steps,
    actionName: props.actionType,
    txns: props.actionTxns,
    nativeSolBalance: props.nativeSolBalance,
    onComplete: props.callbacks.onComplete,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent("user_lending", { uuid: props.attemptUuid, ...props.infoProps });
}

export interface ExecuteLoopActionProps extends ExecuteActionProps {
  infoProps: {
    depositAmount: string;
    depositToken: string;
    borrowAmount: string;
    borrowToken: string;
  };
}

export async function ExecuteLoopAction(props: ExecuteLoopActionProps) {
  const steps = getSteps(props.actionTxns, {
    depositAmount: props.infoProps.depositAmount,
    depositToken: props.infoProps.depositToken,
    borrowAmount: props.infoProps.borrowAmount,
    borrowToken: props.infoProps.borrowToken,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent("user_looping_initiate", { uuid: props.attemptUuid, ...props.infoProps });

  const action = async (
    txns: ActionTxns,
    onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void
  ) => {
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

  await executeActionWrapper({
    action,
    steps,
    actionName: "Looping",
    txns: props.actionTxns,
    nativeSolBalance: props.nativeSolBalance,
    onComplete: props.callbacks.onComplete,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent("user_looping", { uuid: props.attemptUuid, ...props.infoProps });
}

export interface ExecuteStakeActionProps extends ExecuteActionProps {
  infoProps: {
    amount: string;
    swapAmount: string;
    token: string;
    actionType: ActionType;
  };
}

export async function ExecuteStakeAction(props: ExecuteStakeActionProps) {
  const steps = getSteps(props.actionTxns, {
    amount: props.infoProps.amount,
    swapAmount: props.infoProps.swapAmount,
    token: props.infoProps.token,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent(`user_${props.infoProps.actionType}_initiate`, {
      uuid: props.attemptUuid,
      ...props.infoProps,
    });

  const action = async (
    txns: ActionTxns,
    onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void
  ) => {
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

  await executeActionWrapper({
    action,
    steps,
    actionName: props.infoProps.actionType === ActionType.MintLST ? "Staking" : "Unstaking",
    txns: props.actionTxns,
    nativeSolBalance: props.nativeSolBalance,
    onComplete: props.callbacks.onComplete,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent(`user_${props.infoProps.actionType}`, { uuid: props.attemptUuid, ...props.infoProps });
}

export interface ExecuteRepayActionProps extends ExecuteActionProps {
  actionType: ActionType;
  infoProps: {
    repayAmount: string;
    repayToken: string;
    amount: string;
    token: string;
  };
}

export async function ExecuteRepayAction(props: ExecuteRepayActionProps) {
  const steps = getSteps(props.actionTxns, {
    repayAmount: props.infoProps.repayAmount,
    repayToken: props.infoProps.repayToken,
    amount: props.infoProps.amount,
    token: props.infoProps.token,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent(`user_${props.actionType}_initiate`, { uuid: props.attemptUuid, ...props.infoProps });

  const action = async (
    txns: ActionTxns,
    onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void
  ) => {
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

  await executeActionWrapper({
    action,
    steps,
    actionName: props.actionType,
    txns: props.actionTxns,
    nativeSolBalance: props.nativeSolBalance,
    onComplete: props.callbacks.onComplete,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent(`user_${props.actionType}`, { uuid: props.attemptUuid, ...props.infoProps });
}

export interface ExecuteTradeActionProps extends ExecuteActionProps {
  infoProps: {
    depositAmount: string;
    depositToken: string;
    borrowAmount: string;
    borrowToken: string;
    tradeSide: "long" | "short";
  };
}

export async function ExecuteTradeAction(props: ExecuteTradeActionProps) {
  const steps = getSteps(props.actionTxns, {
    depositAmount: props.infoProps.depositAmount,
    depositToken: props.infoProps.depositToken,
    borrowAmount: props.infoProps.borrowAmount,
    borrowToken: props.infoProps.borrowToken,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent("user_trade_initiate", { uuid: props.attemptUuid, ...props.infoProps });

  const action = async (
    txns: ActionTxns,
    onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void
  ) => {
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

  await executeActionWrapper({
    action,
    steps,
    actionName: props.infoProps.tradeSide === "long" ? "Longing" : "Shorting",
    txns: props.actionTxns,
    nativeSolBalance: props.nativeSolBalance,
    onComplete: props.callbacks.onComplete,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent("user_trade", { uuid: props.attemptUuid, ...props.infoProps });
}

// This function is tailor made for closing positions in the arena.
// This functionality slightly deviates from the general functionality, but is still similar to the point where it should live here
export interface ExecuteClosePositionActionProps extends ExecuteActionProps {
  infoProps: {
    token: string;
    tokenSize: string;
    quoteSize: string;
  };
  multiStepToast: MultiStepToastController;
}
export async function ExecuteClosePositionAction(props: ExecuteClosePositionActionProps) {
  const { multiStepToast } = props;

  multiStepToast.resume();

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent("user_close_position_initiate", {
      uuid: props.attemptUuid,
      ...props.infoProps,
    });

  const action = async (
    txns: ActionTxns,
    onSuccessAndNext: (stepsToAdvance?: number, explorerUrl?: string, signature?: string) => void
  ) => {
    const actionResponse = await props.marginfiClient.processTransactions(
      txns.transactions,
      {
        ...props.processOpts,
        callback: (index, success, sig, stepsToAdvance) => {
          if (success) {
            onSuccessAndNext(stepsToAdvance, composeExplorerUrl(sig), sig);
          }
        },
      },
      props.txOpts
    );

    return actionResponse[actionResponse.length - 1];
  };

  try {
    const txnSig = await action(props.actionTxns, (stepsToAdvance, explorerUrl, signature) => {
      multiStepToast.successAndNext(stepsToAdvance, explorerUrl, signature);
    });

    multiStepToast.success(composeExplorerUrl(txnSig), txnSig);

    props.callbacks.captureEvent &&
      props.callbacks.captureEvent("user_close_position", { uuid: props.attemptUuid, ...props.infoProps });

    return txnSig;
  } catch (error) {
    console.error("ExecuteClosePositionAction error:", error);

    const message = extractErrorString(error);

    multiStepToast.setFailed(message, async () => {
      // When retry is clicked, execute the function again.
      await ExecuteClosePositionAction(props);
    });

    captureSentryException(error, JSON.stringify(error), { action: "Close Position" });
  }
}

export interface ExecuteMovePositionActionProps extends ExecuteActionProps {
  infoProps: {
    originAccountAddress: string;
    destinationAccountAddress: string;
  };
}

export async function ExecuteMovePositionAction(props: ExecuteMovePositionActionProps) {
  const steps = getSteps(props.actionTxns, {
    originAccountAddress: props.infoProps.originAccountAddress,
    destinationAccountAddress: props.infoProps.destinationAccountAddress,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent("user_move_position_initiate", { uuid: props.attemptUuid, ...props.infoProps });

  const action = async (
    txns: ActionTxns,
    onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void
  ) => {
    const actionResponse = await props.marginfiClient.processTransactions(
      txns.transactions,
      {
        ...props.processOpts,
        callback: (index, success, sig, stepsToAdvance) => {
          if (success) {
            onSuccessAndNext(stepsToAdvance, composeExplorerUrl(sig), sig);
          }
        },
      },
      props.txOpts
    );

    return actionResponse[actionResponse.length - 1];
  };

  await executeActionWrapper({
    action,
    steps,
    actionName: "Moving Position",
    txns: props.actionTxns,
    nativeSolBalance: props.nativeSolBalance,
    onComplete: props.callbacks.onComplete,
  });

  props.callbacks.captureEvent &&
    props.callbacks.captureEvent("user_move_position", { uuid: props.attemptUuid, ...props.infoProps });
}

export async function ExecuteCollectRewardsAction(props: ExecuteActionProps) {
  const steps = getSteps(props.actionTxns, {});

  const action = async (
    txns: ActionTxns,
    onSuccessAndNext: (stepsToAdvance: number | undefined, explorerUrl?: string, signature?: string) => void
  ) => {
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

  await executeActionWrapper({
    action,
    steps,
    actionName: "Collecting Rewards",
    txns: props.actionTxns,
    nativeSolBalance: props.nativeSolBalance,
    onComplete: props.callbacks.onComplete,
  });

  props.callbacks.captureEvent && props.callbacks.captureEvent("user_collect_rewards", { uuid: props.attemptUuid });
}
