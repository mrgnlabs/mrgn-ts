import { createJupiterApiClient, QuoteGetRequest, QuoteResponse } from "@jup-ag/api";
import { AddressLookupTableAccount, Connection, VersionedTransaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { LUT_PROGRAM_AUTHORITY_INDEX, nativeToUi, uiToNative } from "@mrgnlabs/mrgn-common";

import { deserializeInstruction, getAdressLookupTableAccounts, getSwapQuoteWithRetry } from "../helpers";
import { isWholePosition } from "../../mrgnUtils";
import { ActionMethod, LoopingOptions, RepayWithCollatOptions } from "../types";
import { verifyTxSizeCollat, verifyTxSizeLooping } from "./helpers";
import { STATIC_SIMULATION_ERRORS } from "../../errors";

export async function calculateRepayCollateralParams(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo, // borrow
  repayBank: ExtendedBankInfo, // deposit
  amount: number,
  slippageBps: number,
  connection: Connection,
  priorityFee: number,
  platformFeeBps?: number
): Promise<
  | {
      repayTxn: VersionedTransaction;
      bundleTipTxn: VersionedTransaction | null;
      quote: QuoteResponse;
      amount: number;
    }
  | ActionMethod
> {
  const maxRepayAmount = bank.isActive ? bank?.position.amount : 0;

  const maxAccountsArr = [undefined, 50, 40, 30];

  let firstQuote;

  for (const maxAccounts of maxAccountsArr) {
    const isTxnSplit = maxAccounts === 30;
    const quoteParams = {
      amount: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
      inputMint: repayBank.info.state.mint.toBase58(),
      outputMint: bank.info.state.mint.toBase58(),
      slippageBps: slippageBps,
      maxAccounts: maxAccounts,
      swapMode: "ExactIn",
      platformFeeBps: platformFeeBps,
    } as QuoteGetRequest;
    try {
      const swapQuote = await getSwapQuoteWithRetry(quoteParams);

      if (!maxAccounts) {
        firstQuote = swapQuote;
      }

      if (swapQuote) {
        const outAmount = nativeToUi(swapQuote.outAmount, bank.info.state.mintDecimals);
        const outAmountThreshold = nativeToUi(swapQuote.otherAmountThreshold, bank.info.state.mintDecimals);

        const amountToRepay = outAmount > maxRepayAmount ? maxRepayAmount : outAmountThreshold;

        const txn = await verifyTxSizeCollat(
          marginfiAccount,
          bank,
          repayBank,
          amountToRepay,
          amount,
          swapQuote,
          connection,
          priorityFee,
          isTxnSplit
        );
        if (txn.flashloanTx) {
          return { repayTxn: txn.flashloanTx, bundleTipTxn: txn.bundleTipTxn, quote: swapQuote, amount: amountToRepay };
        } else if (txn.error && maxAccounts === maxAccountsArr[maxAccountsArr.length - 1]) {
          return txn.error;
        }
      } else {
        throw new Error("Swap quote failed");
      }
    } catch (error) {
      console.error(error);
      return STATIC_SIMULATION_ERRORS.FL_FAILED;
    }
  }
  return STATIC_SIMULATION_ERRORS.FL_FAILED;
}

/*
 * Calculates the parameters for a looper flashloan
 */
export async function calculateLoopingParams(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo, // deposit
  loopBank: ExtendedBankInfo, // borrow
  targetLeverage: number,
  amount: number,
  slippageBps: number,
  connection: Connection,
  priorityFee: number
): Promise<
  | {
      loopingTxn: VersionedTransaction;
      bundleTipTxn: VersionedTransaction | null;
      quote: QuoteResponse;
      borrowAmount: BigNumber;
      actualDepositAmount: number;
      priorityFee: number;
    }
  | ActionMethod
> {
  const principalBufferAmountUi = amount * targetLeverage * (slippageBps / 10000);
  const adjustedPrincipalAmountUi = amount - principalBufferAmountUi;

  const { borrowAmount, totalDepositAmount: depositAmount } = marginfiAccount.computeLoopingParams(
    adjustedPrincipalAmountUi,
    targetLeverage,
    bank.address,
    loopBank.address
  );

  const borrowAmountNative = uiToNative(borrowAmount, loopBank.info.state.mintDecimals).toNumber();

  const maxLoopAmount = bank.isActive ? bank?.position.amount : 0;

  const maxAccountsArr = [undefined, 50, 40, 30];

  let firstQuote;

  for (const maxAccounts of maxAccountsArr) {
    const isTxnSplit = maxAccounts === 30;

    const quoteParams = {
      amount: borrowAmountNative,
      inputMint: loopBank.info.state.mint.toBase58(), // borrow
      outputMint: bank.info.state.mint.toBase58(), // deposit
      slippageBps: slippageBps,
      maxAccounts: maxAccounts,
      swapMode: "ExactIn",
    } as QuoteGetRequest;
    try {
      const swapQuote = await getSwapQuoteWithRetry(quoteParams);

      if (!maxAccounts) {
        firstQuote = swapQuote;
      }

      if (swapQuote) {
        const minSwapAmountOutUi = nativeToUi(swapQuote.otherAmountThreshold, bank.info.state.mintDecimals);
        const actualDepositAmountUi = minSwapAmountOutUi + amount;

        const txn = await verifyTxSizeLooping(
          marginfiAccount,
          bank,
          loopBank,
          actualDepositAmountUi,
          borrowAmount,
          swapQuote,
          connection,
          isTxnSplit,
          priorityFee
        );
        if (txn.flashloanTx) {
          return {
            loopingTxn: txn.flashloanTx,
            bundleTipTxn: txn.bundleTipTxn,
            quote: swapQuote,
            borrowAmount: borrowAmount,
            actualDepositAmount: actualDepositAmountUi,
            priorityFee: priorityFee,
          };
        } else if (txn.error && maxAccounts === maxAccountsArr[maxAccountsArr.length - 1]) {
          return txn.error;
        }
      } else {
        throw new Error("Swap quote failed");
      }
    } catch (error) {
      console.error(error);
      return STATIC_SIMULATION_ERRORS.FL_FAILED;
    }
  }

  return STATIC_SIMULATION_ERRORS.FL_FAILED;
}

/*
 * Builds a looper flashloan transaction
 */
export async function loopingBuilder({
  marginfiAccount,
  bank,
  depositAmount,
  options,
  priorityFee,
  isTxnSplit,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  depositAmount: number;
  options: LoopingOptions;
  priorityFee?: number;
  isTxnSplit: boolean;
}): Promise<{
  flashloanTx: VersionedTransaction;
  bundleTipTxn: VersionedTransaction | null;
  addressLookupTableAccounts: AddressLookupTableAccount[];
}> {
  const jupiterQuoteApi = createJupiterApiClient();

  // get fee account for original borrow mint
  // const feeAccount = await getFeeAccount(bank.info.state.mint);

  const { swapInstruction, addressLookupTableAddresses } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: options.loopingQuote,
      userPublicKey: marginfiAccount.authority.toBase58(),
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
    },
  });

  //**not optional but man0s smart**
  // const setupIxs = setupInstructions.length > 0 ? setupInstructions.map(deserializeInstruction) : [];

  const swapIx = deserializeInstruction(swapInstruction);

  //**optional**
  // const swapcleanupIx = cleanupInstruction ? [deserializeInstruction(cleanupInstruction)] : [];
  // tokenLedgerInstruction

  const swapLUTs: AddressLookupTableAccount[] = [];
  swapLUTs.push(...(await getAdressLookupTableAccounts(options.connection, addressLookupTableAddresses)));

  const { flashloanTx, bundleTipTxn, addressLookupTableAccounts } = await marginfiAccount.makeLoopTx(
    depositAmount,
    options.borrowAmount,
    bank.address,
    options.loopingBank.address,
    [swapIx],
    swapLUTs,
    priorityFee,
    true,
    isTxnSplit
  );

  return { flashloanTx, bundleTipTxn, addressLookupTableAccounts };
}

/*
 * Builds a repay with collateral flashloan transaction
 */
export async function repayWithCollatBuilder({
  marginfiAccount,
  bank,
  amount,
  options,
  priorityFee,
  isTxnSplit,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
  options: RepayWithCollatOptions;
  priorityFee?: number;
  isTxnSplit: boolean;
}) {
  const jupiterQuoteApi = createJupiterApiClient();

  // get fee account for original borrow mint
  // const feeAccount = await getFeeAccount(bank.info.state.mint);

  const { swapInstruction, addressLookupTableAddresses } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: options.repayCollatQuote,
      userPublicKey: marginfiAccount.authority.toBase58(),
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
    },
  });
  const swapIx = deserializeInstruction(swapInstruction);

  const swapLUTs: AddressLookupTableAccount[] = [];
  swapLUTs.push(...(await getAdressLookupTableAccounts(options.connection, addressLookupTableAddresses)));

  const { flashloanTx, bundleTipTxn, addressLookupTableAccounts } = await marginfiAccount.makeRepayWithCollatTx(
    amount,
    options.withdrawAmount,
    bank.address,
    options.depositBank.address,
    options.depositBank.isActive && isWholePosition(options.depositBank, options.withdrawAmount),
    bank.isActive && isWholePosition(bank, amount),
    [swapIx],
    swapLUTs,
    priorityFee,
    isTxnSplit
  );

  return { flashloanTx, bundleTipTxn, addressLookupTableAccounts };
}
