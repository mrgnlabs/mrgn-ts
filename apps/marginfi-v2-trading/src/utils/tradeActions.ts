import { QuoteResponse } from "@jup-ag/api";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMethod, calculateBorrowLendPositionParams, STATIC_SIMULATION_ERRORS } from "@mrgnlabs/mrgn-utils";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

export async function calculateClosePositions({
  marginfiAccount,
  borrowBank,
  depositBanks,
  slippageBps,
  connection,
  priorityFee,
  platformFeeBps,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  borrowBank: ActiveBankInfo | null;
  depositBanks: ActiveBankInfo[];
  slippageBps: number;
  connection: Connection;
  priorityFee: number;
  platformFeeBps?: number;
}): Promise<
  | {
      closeTxn: VersionedTransaction | Transaction;
      bundleTipTxn: VersionedTransaction | null;
      quote?: QuoteResponse;
    }
  | ActionMethod
> {
  // user is borrowing and depositing
  if (borrowBank && depositBanks.length === 1) {
    return calculateBorrowLendPositionParams({
      marginfiAccount,
      borrowBank,
      depositBank: depositBanks[0],
      slippageBps,
      connection,
      priorityFee,
      platformFeeBps,
    });
  }

  // user is only depositing
  if (!borrowBank && depositBanks.length > 0 && marginfiAccount) {
    const txn = await marginfiAccount.makeWithdrawAllTx(
      depositBanks.map((bank) => ({
        amount: bank.position.amount,
        bankAddress: bank.address,
      }))
    );
    return {
      closeTxn: txn,
      bundleTipTxn: null,
    };
  }

  return STATIC_SIMULATION_ERRORS.CLOSE_POSITIONS_FL_FAILED;
}
