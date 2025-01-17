import { ActionMessageType, calculateRepayCollateralParams, handleSimulationError } from "@mrgnlabs/mrgn-utils";

import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { isWholePosition, RepayActionTxns } from "@mrgnlabs/mrgn-utils";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

export interface SimulateActionProps {
  txns: (VersionedTransaction | Transaction)[];
  account: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
}

export interface CalculateRepayTransactionsProps {
  actionType: ActionType;
  marginfiAccount: MarginfiAccountWrapper;
  selectedBank: ExtendedBankInfo;
  selectedSecondaryBank: ExtendedBankInfo;
  connection: Connection;
  platformFeeBps: number;
  slippageBps: number;
  repayAmount: number;
}

export async function calculateRepayTransactions(props: CalculateRepayTransactionsProps): Promise<
  | {
      repayCollatObject: RepayActionTxns;
      amount: number;
    }
  | ActionMessageType
> {
  if (props.actionType === ActionType.Repay) {
    const repayTx = await props.marginfiAccount.makeRepayTx(
      props.repayAmount,
      props.selectedBank.address,
      props.selectedBank.isActive && isWholePosition(props.selectedBank, props.repayAmount)
    );

    return {
      repayCollatObject: {
        actionTxn: repayTx,
        additionalTxns: [],
        actionQuote: undefined,
      },
      amount: props.repayAmount,
    };
  } else if (props.actionType === ActionType.RepayCollat) {
    const repayCollatResult = await calculateRepayCollateralParams({
      borrowBank: props.selectedBank,
      depositBank: props.selectedSecondaryBank,
      marginfiAccount: props.marginfiAccount,
      connection: props.connection,
      platformFeeBps: props.platformFeeBps,
      slippageBps: props.slippageBps,
      withdrawAmount: props.repayAmount,
    });

    if (repayCollatResult && "actionMessage" in repayCollatResult) {
      return repayCollatResult.actionMessage as ActionMessageType;
    } else if (repayCollatResult && "repayCollatObject" in repayCollatResult) {
      return {
        repayCollatObject: repayCollatResult.repayCollatObject,
        amount: props.repayAmount,
      };
    }
  }

  return {
    repayCollatObject: {
      actionTxn: null,
      additionalTxns: [],
      actionQuote: null,
    },
    amount: 0,
  }; // TODO: return actionMessage
}

export const getSimulationResult = async (props: SimulateActionProps) => {
  let actionMethod: ActionMessageType | undefined = undefined;
  let simulationResult: SimulationResult | null = null;

  try {
    simulationResult = await simulateFlashLoan(props);
  } catch (error: any) {
    const actionString = "Repaying Collateral";
    actionMethod = handleSimulationError(error, props.bank, false, actionString);
  }

  return { simulationResult, actionMethod };
};

async function simulateFlashLoan({ account, bank, txns }: SimulateActionProps) {
  let simulationResult: SimulationResult;

  if (txns.length > 0) {
    simulationResult = await account.simulateBorrowLendTransaction(txns, [bank.address]);
    return simulationResult;
  } else {
    console.error("Failed to simulate flashloan");
    throw new Error("Failed to simulate flashloan");
  }
}
