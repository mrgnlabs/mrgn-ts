import { ActionMessageType, calculateRepayCollateralParams } from "@mrgnlabs/mrgn-utils";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { isWholePosition, RepayActionTxns } from "@mrgnlabs/mrgn-utils";
import { Connection } from "@solana/web3.js";

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
  let result: {
    repayCollatObject: RepayActionTxns;
    amount: number;
  };

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
}
