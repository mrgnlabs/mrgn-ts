import { QuoteResponse } from "@jup-ag/api";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  LoopingObject,
  ActionMethod,
  calculateLoopingParams,
  calculateRepayCollateralParams,
} from "@mrgnlabs/mrgn-utils";
import { Connection, VersionedTransaction } from "@solana/web3.js";

export async function calculateRepayCollateral(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo, // borrow
  repayBank: ExtendedBankInfo, // deposit
  amount: number,
  slippageBps: number,
  connection: Connection,
  priorityFee: number
): Promise<
  | {
      repayTxn: VersionedTransaction;
      bundleTipTxn: VersionedTransaction | null;
      quote: QuoteResponse;
      amount: number;
    }
  | ActionMethod
> {
  // TODO setup logging again
  // capture("repay_with_collat", {
  //   amountIn: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
  //   firstQuote,
  //   bestQuote: swapQuote,
  //   inputMint: repayBank.info.state.mint.toBase58(),
  //   outputMint: bank.info.state.mint.toBase58(),
  // });

  const result = await calculateRepayCollateralParams(
    marginfiAccount,
    bank,
    repayBank,
    amount,
    slippageBps,
    connection,
    priorityFee
  );

  return result;
}
