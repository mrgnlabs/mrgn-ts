import { Connection } from "@solana/web3.js";

import {
  ActionProcessingError,
  calculateRepayCollateralParams,
  isWholePosition,
  RepayActionTxns,
  STATIC_SIMULATION_ERRORS,
} from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { JupiterOptions } from "~/components/settings";

export interface CalculateRepayTransactionsProps {
  actionType: ActionType;
  marginfiAccount: MarginfiAccountWrapper;
  selectedBank: ExtendedBankInfo;
  selectedSecondaryBank: ExtendedBankInfo;
  connection: Connection;
  platformFeeBps: number;
  jupiterOptions: JupiterOptions;
  repayAmount: number;
}

export async function calculateRepayTransactions(props: CalculateRepayTransactionsProps): Promise<{
  repayCollatObject: RepayActionTxns;
  amount: number;
}> {
  if (props.actionType === ActionType.Repay) {
    const repayTx = await props.marginfiAccount.makeRepayTx(
      props.repayAmount,
      props.selectedBank.address,
      props.selectedBank.isActive && isWholePosition(props.selectedBank, props.repayAmount)
    );

    return {
      repayCollatObject: {
        transactions: [repayTx],
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
      slippageMode: props.jupiterOptions?.slippageMode,
      slippageBps: props.jupiterOptions?.slippageBps,
      withdrawAmount: props.repayAmount,
    });

    return {
      repayCollatObject: repayCollatResult.repayCollatObject,
      amount: repayCollatResult.amount,
    };
  }

  throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.ACTION_TYPE_CHECK);
}
