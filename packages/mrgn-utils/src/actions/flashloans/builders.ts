import { createJupiterApiClient, QuoteGetRequest, QuoteResponse } from "@jup-ag/api";
import { AccountInfo, AddressLookupTableAccount, Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import { MarginfiAccountWrapper, MarginfiClient, SolanaTransaction } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { LUT_PROGRAM_AUTHORITY_INDEX, nativeToUi, TransactionBroadcastType, uiToNative } from "@mrgnlabs/mrgn-common";

import { deserializeInstruction, getAdressLookupTableAccounts, getSwapQuoteWithRetry } from "../helpers";
import { isWholePosition } from "../../mrgnUtils";
import { ActionMessageType, LoopingObject, LoopingOptions, RepayWithCollatOptions } from "../types";
import { STATIC_SIMULATION_ERRORS } from "../../errors";
import { TOKEN_2022_MINTS, getFeeAccount } from "../../jup-referral.utils";

import {
  calculateMaxRepayableCollateral,
  getLoopingParamsForAccount,
  getLoopingParamsForClient,
  verifyTxSizeCloseBorrowLendPosition,
  verifyTxSizeCollat,
  verifyTxSizeLooping,
} from "./helpers";

// ------------------------------------------------------------------//
// Builders //
/**
 * This file contains builder functions for creating and managing flashloan transactions.
 * These builders support the construction, validation, and execution of various flashloan operations,
 * such as looping and repaying with collateral.
 */
// ------------------------------------------------------------------//

/*
 * Calculates the parameters for a repay with collateral flashloan
 *
 * IDEA to improve: instead of for loop, promise.all
 */
export async function calculateRepayCollateralParams(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo, // borrow
  repayBank: ExtendedBankInfo, // deposit
  amount: number,
  slippageBps: number,
  connection: Connection,
  priorityFee: number,
  platformFeeBps: number,
  broadcastType: TransactionBroadcastType
): Promise<
  | {
      repayTxn: VersionedTransaction;
      feedCrankTxs: VersionedTransaction[];
      quote: QuoteResponse;
      amount: number;
      lastValidBlockHeight?: number;
    }
  | ActionMessageType
> {
  const maxRepayAmount = bank.isActive ? bank?.position.amount : 0;

  // decreased maxAccounts from [undefined, 50, 40, 30] to [50, 40, 30]
  const maxAccountsArr = [50, 40, 30];

  let firstQuote;

  for (const maxAccounts of maxAccountsArr) {
    const isTxnSplit = true; // maxAccounts === 30;
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
      const swapQuote = await getSwapQuoteWithRetry(quoteParams, 2, 1000);

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
          broadcastType
        );
        if (txn.flashloanTx) {
          return {
            repayTxn: txn.flashloanTx,
            feedCrankTxs: txn.feedCrankTxs,
            quote: swapQuote,
            amount: amountToRepay,
            lastValidBlockHeight: txn?.lastValidBlockHeight,
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
 * Calculates the parameters for a close all positions flashloan
 */
export async function calculateBorrowLendPositionParams({
  marginfiAccount,
  borrowBank,
  depositBank,
  slippageBps,
  connection,
  priorityFee,
  platformFeeBps,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  borrowBank: ActiveBankInfo;
  depositBank: ActiveBankInfo;
  slippageBps: number;
  connection: Connection;
  priorityFee: number;
  platformFeeBps?: number;
}): Promise<
  | {
      closeTxn: VersionedTransaction;
      feedCrankTxs: VersionedTransaction[];
      quote: QuoteResponse;
    }
  | ActionMessageType
> {
  let firstQuote;
  const maxAccountsArr = [undefined, 50, 40, 30];

  if (!borrowBank.isActive) throw new Error("not active");

  const maxAmount = await calculateMaxRepayableCollateral(borrowBank, depositBank, slippageBps);

  if (!maxAmount) return STATIC_SIMULATION_ERRORS.CLOSE_POSITIONS_FL_FAILED;

  for (const maxAccounts of maxAccountsArr) {
    const isTxnSplit = maxAccounts === 30;
    const quoteParams = {
      amount: uiToNative(maxAmount, depositBank.info.state.mintDecimals).toNumber(),
      inputMint: depositBank.info.state.mint.toBase58(),
      outputMint: borrowBank.info.state.mint.toBase58(),
      slippageBps: slippageBps,
      platformFeeBps: platformFeeBps,
      maxAccounts: maxAccounts,
      swapMode: "ExactIn",
    } as QuoteGetRequest;
    try {
      const swapQuote = await getSwapQuoteWithRetry(quoteParams);

      if (!maxAccounts) {
        firstQuote = swapQuote;
      }

      if (swapQuote) {
        const txn = await verifyTxSizeCloseBorrowLendPosition(
          marginfiAccount,
          depositBank,
          borrowBank,
          swapQuote,
          connection,
          isTxnSplit,
          priorityFee
        );

        if (txn.flashloanTx) {
          return { closeTxn: txn.flashloanTx, feedCrankTxs: txn.feedCrankTxs, quote: swapQuote };
        } else if (txn.error && maxAccounts === maxAccountsArr[maxAccountsArr.length - 1]) {
          return txn.error;
        }
      } else {
        throw new Error("Swap quote failed");
      }
    } catch (error) {
      console.error(error);
      return STATIC_SIMULATION_ERRORS.CLOSE_POSITIONS_FL_FAILED;
    }
  }
  return STATIC_SIMULATION_ERRORS.CLOSE_POSITIONS_FL_FAILED;
}

/*
 * Calculates the parameters for a looper flashloan
 */
export async function calculateLoopingParams({
  marginfiAccount,
  marginfiClient,
  depositBank,
  borrowBank,
  targetLeverage,
  amount,
  slippageBps,
  connection,
  priorityFee,
  platformFeeBps,
  broadcastType,
}: {
  marginfiAccount: MarginfiAccountWrapper | null;
  marginfiClient?: MarginfiClient;
  depositBank: ExtendedBankInfo; // deposit
  borrowBank: ExtendedBankInfo; // borrow
  targetLeverage: number;
  amount: number;
  slippageBps: number;
  connection: Connection;
  priorityFee: number;
  platformFeeBps?: number;
  isTrading?: boolean;
  broadcastType: TransactionBroadcastType;
}): Promise<LoopingObject | ActionMessageType> {
  if (!marginfiAccount && !marginfiClient) {
    return STATIC_SIMULATION_ERRORS.NOT_INITIALIZED;
  }

  let borrowAmount: BigNumber, depositAmount: BigNumber, borrowAmountNative: number;
  if (marginfiAccount) {
    const params = getLoopingParamsForAccount(
      marginfiAccount,
      depositBank,
      borrowBank,
      targetLeverage,
      amount,
      slippageBps
    );
    borrowAmount = params.borrowAmount;
    depositAmount = params.depositAmount;
    borrowAmountNative = params.borrowAmountNative;
  } else {
    if (!marginfiClient) return STATIC_SIMULATION_ERRORS.NOT_INITIALIZED;
    const params = getLoopingParamsForClient(
      marginfiClient,
      depositBank,
      borrowBank,
      targetLeverage,
      amount,
      slippageBps
    );
    borrowAmount = params.borrowAmount;
    depositAmount = params.depositAmount;
    borrowAmountNative = params.borrowAmountNative;
  }
  // const principalBufferAmountUi = amount * targetLeverage * (slippageBps / 10000);
  // const adjustedPrincipalAmountUi = amount - principalBufferAmountUi;

  // const maxLoopAmount = depositBank.isActive ? depositBank?.position.amount : 0;

  // decreased maxAccounts from [undefined, 50, 40, 30] to [40, 30]
  const maxAccountsArr = marginfiAccount ? [40, 25] : [40, 25];

  let firstQuote;

  for (const maxAccounts of maxAccountsArr) {
    // const isTxnSplit = maxAccounts === 30;

    const quoteParams = {
      amount: borrowAmountNative,
      inputMint: borrowBank.info.state.mint.toBase58(), // borrow
      outputMint: depositBank.info.state.mint.toBase58(), // deposit
      slippageBps: slippageBps,
      platformFeeBps: platformFeeBps, // platform fee
      maxAccounts: maxAccounts,
      swapMode: "ExactIn",
    } as QuoteGetRequest;
    try {
      const swapQuote = await getSwapQuoteWithRetry(quoteParams);

      if (!maxAccounts) {
        firstQuote = swapQuote;
      }

      if (swapQuote) {
        const minSwapAmountOutUi = nativeToUi(swapQuote.otherAmountThreshold, depositBank.info.state.mintDecimals);
        const actualDepositAmountUi = minSwapAmountOutUi + amount;
        let txn: {
          flashloanTx: VersionedTransaction | null;
          feedCrankTxs: VersionedTransaction[];
          addressLookupTableAccounts: AddressLookupTableAccount[];
          error?: ActionMessageType;
        } = {
          flashloanTx: null,
          feedCrankTxs: [],
          addressLookupTableAccounts: [],
          error: undefined,
        };

        if (marginfiAccount) {
          txn = await verifyTxSizeLooping(
            marginfiAccount,
            depositBank,
            borrowBank,
            actualDepositAmountUi,
            borrowAmount,
            swapQuote,
            connection,
            priorityFee,
            broadcastType
          );
        }
        if (txn.flashloanTx || !marginfiAccount) {
          return {
            loopingTxn: txn.flashloanTx ?? null,
            feedCrankTxs: txn.feedCrankTxs,
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

export async function calculateLoopingTransaction({
  marginfiAccount,
  borrowBank,
  depositBank,
  connection,
  priorityFee,
  loopObject,
  isTrading,
  broadcastType,
}: {
  marginfiAccount: MarginfiAccountWrapper | null;
  borrowBank: ExtendedBankInfo;
  depositBank: ExtendedBankInfo;
  connection: Connection;
  priorityFee: number;
  loopObject?: LoopingObject;
  isTrading?: boolean;
  broadcastType: TransactionBroadcastType;
}): Promise<ActionMessageType | LoopingObject> {
  if (loopObject && marginfiAccount) {
    const txn = await verifyTxSizeLooping(
      marginfiAccount,
      depositBank,
      borrowBank,
      loopObject.actualDepositAmount,
      loopObject.borrowAmount,
      loopObject.quote,
      connection,
      priorityFee,
      broadcastType
    );

    if (!txn) {
      return STATIC_SIMULATION_ERRORS.FL_FAILED;
    } else if (txn.error) {
      return txn.error;
    } else {
      return {
        loopingTxn: txn.flashloanTx,
        feedCrankTxs: txn.feedCrankTxs,
        quote: loopObject.quote,
        borrowAmount: loopObject.borrowAmount,
        actualDepositAmount: loopObject.actualDepositAmount,
        priorityFee: priorityFee,
      };
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
  broadcastType,
}: // isTxnSplit,
{
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  depositAmount: number;
  options: LoopingOptions;
  priorityFee: number;
  broadcastType: TransactionBroadcastType;
}): Promise<{
  flashloanTx: VersionedTransaction;
  feedCrankTxs: VersionedTransaction[];
  addressLookupTableAccounts: AddressLookupTableAccount[];
}> {
  const jupiterQuoteApi = createJupiterApiClient();
  let feeAccountInfo: AccountInfo<any> | null = null;

  const feeMint =
    options.loopingQuote.swapMode === "ExactIn" ? options.loopingQuote.outputMint : options.loopingQuote.inputMint;
  const feeAccount = getFeeAccount(new PublicKey(feeMint));
  if (!TOKEN_2022_MINTS.includes(feeMint)) {
    feeAccountInfo = await options.connection.getAccountInfo(new PublicKey(feeAccount));
  }

  const { swapInstruction, addressLookupTableAddresses } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: options.loopingQuote,
      userPublicKey: marginfiAccount.authority.toBase58(),
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
      feeAccount: feeAccountInfo ? feeAccount : undefined,
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

  const { flashloanTx, feedCrankTxs, addressLookupTableAccounts } = await marginfiAccount.makeLoopTx(
    depositAmount,
    options.borrowAmount,
    bank.address,
    options.loopingBank.address,
    [swapIx],
    swapLUTs,
    priorityFee,
    true, // deprecated remove
    broadcastType
  );

  return { flashloanTx, feedCrankTxs, addressLookupTableAccounts };
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
  broadcastType,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
  options: RepayWithCollatOptions;
  priorityFee: number;
  broadcastType: TransactionBroadcastType;
}) {
  const jupiterQuoteApi = createJupiterApiClient();
  let feeAccountInfo: AccountInfo<any> | null = null;

  const feeMint =
    options.repayCollatQuote.swapMode === "ExactIn"
      ? options.repayCollatQuote.outputMint
      : options.repayCollatQuote.inputMint;
  const feeAccount = getFeeAccount(new PublicKey(feeMint));
  if (!TOKEN_2022_MINTS.includes(feeMint)) {
    feeAccountInfo = await options.connection.getAccountInfo(new PublicKey(feeAccount));
  }

  const { swapInstruction, addressLookupTableAddresses } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: options.repayCollatQuote,
      userPublicKey: marginfiAccount.authority.toBase58(),
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
      feeAccount: feeAccountInfo ? feeAccount : undefined,
    },
  });
  const swapIx = deserializeInstruction(swapInstruction);

  const swapLUTs: AddressLookupTableAccount[] = [];
  swapLUTs.push(...(await getAdressLookupTableAccounts(options.connection, addressLookupTableAddresses)));
  const { blockhash, lastValidBlockHeight } = await options.connection.getLatestBlockhash("confirmed");

  const { flashloanTx, feedCrankTxs, addressLookupTableAccounts } = await marginfiAccount.makeRepayWithCollatTx(
    amount,
    options.withdrawAmount,
    bank.address,
    options.depositBank.address,
    options.depositBank.isActive && isWholePosition(options.depositBank, options.withdrawAmount),
    bank.isActive && isWholePosition(bank, amount),
    [swapIx],
    swapLUTs,
    priorityFee,
    false,
    blockhash,
    broadcastType
  );

  return { flashloanTx, feedCrankTxs, addressLookupTableAccounts, lastValidBlockHeight };
}

/*
 * Builds a close all positions flashloan transaction
 */
export async function closePositionBuilder({
  marginfiAccount,
  depositBank,
  borrowBank,
  quote,
  connection,
  isTxnSplit,
  priorityFee,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBank: ActiveBankInfo;
  borrowBank: ActiveBankInfo;
  quote: QuoteResponse;
  connection: Connection;
  isTxnSplit?: boolean;
  priorityFee?: number;
}) {
  const jupiterQuoteApi = createJupiterApiClient();
  let feeAccountInfo: AccountInfo<any> | null = null;

  const feeMint = quote.swapMode === "ExactIn" ? quote.outputMint : quote.inputMint;
  const feeAccount = getFeeAccount(new PublicKey(feeMint));
  if (!TOKEN_2022_MINTS.includes(feeMint)) {
    feeAccountInfo = await connection.getAccountInfo(new PublicKey(feeAccount));
  }
  const { swapInstruction, addressLookupTableAddresses } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: quote,
      userPublicKey: marginfiAccount.authority.toBase58(),
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
      feeAccount: feeAccountInfo ? feeAccount : undefined,
    },
  });

  // const setupIxs = setupInstructions.length > 0 ? setupInstructions.map(deserializeInstruction) : []; //**not optional but man0s smart**
  const swapIx = deserializeInstruction(swapInstruction);
  // const swapcleanupIx = cleanupInstruction ? [deserializeInstruction(cleanupInstruction)] : []; **optional**
  // tokenLedgerInstruction **also optional**

  const swapLUTs: AddressLookupTableAccount[] = [];
  swapLUTs.push(...(await getAdressLookupTableAccounts(connection, addressLookupTableAddresses)));

  const { flashloanTx, feedCrankTxs, addressLookupTableAccounts } = await marginfiAccount.makeRepayWithCollatTx(
    borrowBank.position.amount,
    depositBank.position.amount,
    borrowBank.address,
    depositBank.address,
    true,
    true,
    [swapIx],
    swapLUTs,
    priorityFee,
    isTxnSplit
  );

  return { flashloanTx, feedCrankTxs, addressLookupTableAccounts };
}
