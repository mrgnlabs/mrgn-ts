import { createJupiterApiClient, QuoteGetRequest } from "@jup-ag/api";
import { AccountInfo, AddressLookupTableAccount, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import {
  addTransactionMetadata,
  LUT_PROGRAM_AUTHORITY_INDEX,
  nativeToUi,
  SolanaTransaction,
  TransactionType,
  uiToNative,
  WSOL_MINT,
} from "@mrgnlabs/mrgn-common";

import { deserializeInstruction, getAdressLookupTableAccounts, getSwapQuoteWithRetry } from "../helpers";
import { isWholePosition } from "../../mrgnUtils";
import {
  ActionMessageType,
  ActionProcessingError,
  CalculateClosePositionProps,
  CalculateLoopingProps,
  CalculateRepayCollateralProps,
  ClosePositionActionTxns,
  ClosePositionProps,
  LoopActionTxns,
  LoopingProps,
  RepayActionTxns,
  RepayWithCollatProps,
} from "../types";
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
 */
export async function calculateRepayCollateralParams({
  slippageBps,
  platformFeeBps,
  slippageMode,
  ...repayProps
}: CalculateRepayCollateralProps): Promise<{
  repayCollatObject: RepayActionTxns;
  amount: number;
}> {
  const maxRepayAmount = repayProps.borrowBank.isActive ? repayProps.borrowBank?.position.amount : 0;

  // decreased maxAccounts from [undefined, 50, 40, 30] to [50, 40, 30]
  const maxAccountsArr = [50, 40, 30];

  let firstQuote;

  for (const maxAccounts of maxAccountsArr) {
    console.log("Reducing Jupiter maxAccounts to %s to optimize transaction size...", maxAccounts);
    const quoteParams = {
      amount: uiToNative(repayProps.withdrawAmount, repayProps.depositBank.info.state.mintDecimals).toNumber(),
      inputMint: repayProps.depositBank.info.state.mint.toBase58(),
      outputMint: repayProps.borrowBank.info.state.mint.toBase58(),
      slippageBps: slippageMode === "FIXED" ? slippageBps : undefined,
      maxAccounts: maxAccounts,
      swapMode: "ExactIn",
      platformFeeBps,
      dynamicSlippage: slippageMode === "DYNAMIC" ? true : false,
    } as QuoteGetRequest;

    const swapQuote = await getSwapQuoteWithRetry(quoteParams, 2, 1000);

    if (!maxAccounts) {
      firstQuote = swapQuote;
    }

    const outAmount = nativeToUi(swapQuote.outAmount, repayProps.borrowBank.info.state.mintDecimals);
    const outAmountThreshold = nativeToUi(
      swapQuote.otherAmountThreshold,
      repayProps.borrowBank.info.state.mintDecimals
    );

    const amountToRepay = outAmount > maxRepayAmount ? maxRepayAmount : outAmountThreshold;

    const txn = await verifyTxSizeCollat({
      ...repayProps,
      quote: swapQuote,
      repayAmount: amountToRepay,
    });

    if (txn.transactions.length) {
      return {
        repayCollatObject: {
          transactions: txn.transactions,
          actionQuote: swapQuote,
        },
        amount: amountToRepay,
      };
    }
  }
  throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.FL_FAILED);
}

/*
 * Calculates the parameters for a close all positions flashloan
 */
export async function calculateBorrowLendPositionParams({
  slippageBps,
  slippageMode,
  platformFeeBps,
  ...closePostionProps
}: CalculateClosePositionProps): Promise<ClosePositionActionTxns> {
  let firstQuote;
  const maxAccountsArr = [40, 30];

  if (!closePostionProps.borrowBank.isActive)
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.BANK_NOT_ACTIVE_CHECK);

  const { amount: maxAmount, maxOverflowHit } = await calculateMaxRepayableCollateral(
    closePostionProps.borrowBank,
    closePostionProps.depositBank,
    slippageBps,
    slippageMode
  ).catch((error) => {
    if (error instanceof ActionProcessingError) {
      if (error.details.code === STATIC_SIMULATION_ERRORS.MAX_AMOUNT_CALCULATION_FAILED.code) {
        throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.CLOSE_POSITIONS_FL_FAILED);
      }
    }
    throw error;
  });

  if (!maxAmount) throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.CLOSE_POSITIONS_FL_FAILED);

  for (const maxAccounts of maxAccountsArr) {
    const quoteParams: QuoteGetRequest = {
      amount: uiToNative(maxAmount, closePostionProps.depositBank.info.state.mintDecimals).toNumber(),
      inputMint: closePostionProps.depositBank.info.state.mint.toBase58(),
      outputMint: closePostionProps.borrowBank.info.state.mint.toBase58(),
      slippageBps: slippageMode === "FIXED" ? slippageBps : undefined,
      dynamicSlippage: slippageMode === "DYNAMIC" ? true : false,
      platformFeeBps: platformFeeBps,
      maxAccounts: maxAccounts,
      swapMode: "ExactIn",
    };

    const swapQuote = await getSwapQuoteWithRetry(quoteParams);

    if (!maxAccounts) {
      firstQuote = swapQuote;
    }

    const txn = await verifyTxSizeCloseBorrowLendPosition({
      ...closePostionProps,
      quote: swapQuote,
    });

    if (txn.transactions.length) {
      return {
        transactions: txn.transactions,
        actionQuote: swapQuote,
        maxAmount,
      };
    }
  }
  throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.CLOSE_POSITIONS_FL_FAILED);
}

/*
 * Calculates the parameters for a looper flashloan
 */
export async function calculateLoopingParams({
  marginfiClient,
  targetLeverage,
  slippageBps,
  slippageMode,
  platformFeeBps,
  setupBankAddresses,
  ...loopingProps
}: CalculateLoopingProps): Promise<LoopActionTxns> {
  if (!loopingProps.marginfiAccount && !marginfiClient) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.NOT_INITIALIZED);
  }

  let borrowAmount: BigNumber, depositAmount: BigNumber, borrowAmountNative: number;
  if (loopingProps.marginfiAccount) {
    const params = getLoopingParamsForAccount(
      loopingProps.marginfiAccount,
      loopingProps.depositBank,
      loopingProps.borrowBank,
      targetLeverage,
      loopingProps.depositAmount,
      slippageBps,
      loopingProps.emodeImpact
    );
    borrowAmount = params.borrowAmount;
    depositAmount = params.depositAmount;
    borrowAmountNative = params.borrowAmountNative;
  } else {
    // this code should not be accesed in the arena
    const params = getLoopingParamsForClient(
      marginfiClient,
      loopingProps.depositBank,
      loopingProps.borrowBank,
      targetLeverage,
      loopingProps.depositAmount,
      slippageBps,
      loopingProps.emodeImpact
    );

    borrowAmount = params.borrowAmount;
    depositAmount = params.depositAmount;
    borrowAmountNative = params.borrowAmountNative;
  }

  const maxAccountsArr = [40, 30];

  let firstQuote;

  for (const maxAccounts of maxAccountsArr) {
    const quoteParams: QuoteGetRequest = {
      amount: borrowAmountNative,
      inputMint: loopingProps.borrowBank.info.state.mint.toBase58(), // borrow
      outputMint: loopingProps.depositBank.info.state.mint.toBase58(), // deposit
      dynamicSlippage: slippageMode === "DYNAMIC" ? true : false,
      slippageBps: slippageMode === "FIXED" ? slippageBps : undefined,
      platformFeeBps: platformFeeBps, // platform fee
      maxAccounts: maxAccounts,
      swapMode: "ExactIn",
    };

    const swapQuote = await getSwapQuoteWithRetry(quoteParams);

    if (!maxAccounts) {
      firstQuote = swapQuote;
    }

    if (swapQuote) {
      const minSwapAmountOutUi = nativeToUi(
        swapQuote.otherAmountThreshold,
        loopingProps.depositBank.info.state.mintDecimals
      );
      const actualDepositAmountUi = minSwapAmountOutUi + loopingProps.depositAmount;
      let txn: {
        transactions: SolanaTransaction[];
        error?: ActionMessageType;
        lastValidBlockHeight?: number;
      } = {
        transactions: [],
      };

      if (loopingProps.marginfiAccount) {
        txn = await verifyTxSizeLooping({
          ...loopingProps,
          quote: swapQuote,
          borrowAmount: borrowAmount,
          actualDepositAmount: actualDepositAmountUi,
          setupBankAddresses,
        });
      }
      return {
        transactions: txn.transactions,
        actionQuote: swapQuote,
        actualDepositAmount: actualDepositAmountUi,
        borrowAmount: new BigNumber(borrowAmount),
      };
    }
  }

  throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.FL_FAILED);
}

export async function calculateLoopingTransaction(props: LoopingProps): Promise<LoopActionTxns> {
  if (props.marginfiAccount) {
    const txn = await verifyTxSizeLooping(props);

    return {
      transactions: txn.transactions,
      actionQuote: props.quote,
      actualDepositAmount: props.actualDepositAmount,
      borrowAmount: props.borrowAmount,
    };
  }
  throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.FL_FAILED);
}

/*
 * Builds a looper flashloan transaction
 */
export async function loopingBuilder({
  marginfiAccount,
  depositAmount,
  actualDepositAmount,
  borrowAmount,
  depositBank,
  borrowBank,
  quote,
  connection,
  setupBankAddresses,
  overrideInferAccounts,
}: LoopingProps): Promise<FlashloanBuilderResponse> {
  if (!marginfiAccount) throw new Error("not initialized");

  const jupiterQuoteApi = createJupiterApiClient({
    basePath: "https://lite-api.jup.ag/swap/v1",
  });
  let feeAccountInfo: AccountInfo<any> | null = null;

  const feeMint = quote.swapMode === "ExactIn" ? quote.outputMint : quote.inputMint;
  const feeAccount = getFeeAccount(new PublicKey(feeMint));

  // TODO: check if fees support for token2022 is needed
  if (!TOKEN_2022_MINTS.includes(feeMint)) {
    feeAccountInfo = await connection.getAccountInfo(new PublicKey(feeAccount));
  }

  if (!feeAccountInfo) {
    console.warn("Warning: feeAccountInfo is undefined");
  }

  const { swapInstruction, addressLookupTableAddresses } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: quote,
      userPublicKey: marginfiAccount.authority.toBase58(),
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
      feeAccount: feeAccountInfo ? feeAccount : undefined,
      wrapAndUnwrapSol: false,
    },
  });

  // **not optional but man0s smart**
  // const setupIxs = setupInstructions.length > 0 ? setupInstructions.map(deserializeInstruction) : [];

  const swapIx = deserializeInstruction(swapInstruction);

  // **optional**
  // const swapcleanupIx = cleanupInstruction ? [deserializeInstruction(cleanupInstruction)] : [];
  // tokenLedgerInstruction

  const swapLUTs: AddressLookupTableAccount[] = [];
  swapLUTs.push(...(await getAdressLookupTableAccounts(connection, addressLookupTableAddresses)));
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const { transactions, txOverflown } = await marginfiAccount.makeLoopTxV2({
    depositAmount: actualDepositAmount,
    inputDepositAmount: depositAmount,
    borrowAmount,
    depositBankAddress: depositBank.address,
    borrowBankAddress: borrowBank.address,
    swap: {
      instructions: [swapIx],
      lookupTables: swapLUTs,
    },
    blockhash,
    overrideInferAccounts,
  });

  return { transactions, txOverflown, lastValidBlockHeight };
}

type FlashloanBuilderResponse = {
  transactions: SolanaTransaction[];
  lastValidBlockHeight?: number;
  txOverflown: boolean;
};

/*
 * Builds a repay with collateral flashloan transaction
 */
export async function repayWithCollatBuilder({
  marginfiAccount,
  borrowBank,
  depositBank,
  repayAmount,
  withdrawAmount,
  quote,
  connection,
}: RepayWithCollatProps): Promise<FlashloanBuilderResponse> {
  const jupiterQuoteApi = createJupiterApiClient({
    basePath: "https://lite-api.jup.ag/swap/v1",
  });
  let feeAccountInfo: AccountInfo<any> | null = null;

  const feeMint = quote.swapMode === "ExactIn" ? quote.outputMint : quote.inputMint;
  const feeAccount = getFeeAccount(new PublicKey(feeMint));

  // TODO: check if fees support for token2022 is needed
  if (!TOKEN_2022_MINTS.includes(feeMint)) {
    feeAccountInfo = await connection.getAccountInfo(new PublicKey(feeAccount));
  }

  const { swapInstruction, addressLookupTableAddresses } = await jupiterQuoteApi.swapInstructionsPost({
    swapRequest: {
      quoteResponse: quote,
      userPublicKey: marginfiAccount.authority.toBase58(),
      programAuthorityId: LUT_PROGRAM_AUTHORITY_INDEX,
      feeAccount: feeAccountInfo ? feeAccount : undefined,
      wrapAndUnwrapSol: false,
    },
  });
  const swapIx = deserializeInstruction(swapInstruction);

  const swapLUTs: AddressLookupTableAccount[] = [];
  swapLUTs.push(...(await getAdressLookupTableAccounts(connection, addressLookupTableAddresses)));
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const { transactions, txOverflown } = await marginfiAccount.makeRepayWithCollatTxV2({
    repayAmount,
    withdrawAmount,
    borrowBankAddress: borrowBank.address,
    depositBankAddress: depositBank.address,
    withdrawAll: depositBank.isActive && isWholePosition(depositBank, withdrawAmount),
    repayAll: borrowBank.isActive && isWholePosition(borrowBank, repayAmount),
    swap: {
      instructions: [swapIx],
      lookupTables: swapLUTs,
    },
    blockhash,
  });

  return { transactions, txOverflown, lastValidBlockHeight };
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
}: ClosePositionProps): Promise<FlashloanBuilderResponse> {
  const jupiterQuoteApi = createJupiterApiClient({
    basePath: "https://lite-api.jup.ag/swap/v1",
  });
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
      wrapAndUnwrapSol: false,
    },
  });
  const swapIx = deserializeInstruction(swapInstruction);

  const swapLUTs: AddressLookupTableAccount[] = [];
  swapLUTs.push(...(await getAdressLookupTableAccounts(connection, addressLookupTableAddresses)));

  const { transactions, txOverflown } = await marginfiAccount.makeRepayWithCollatTxV2({
    repayAmount: borrowBank.position.amount,
    withdrawAmount: depositBank.position.amount,
    borrowBankAddress: borrowBank.address,
    depositBankAddress: depositBank.address,
    withdrawAll: true,
    repayAll: true,
    swap: {
      instructions: [swapIx],
      lookupTables: swapLUTs,
    },
  });

  const updatedTransactions = transactions.map((tx) =>
    tx.type === TransactionType.REPAY_COLLAT
      ? addTransactionMetadata(tx, {
          ...tx,
          type: TransactionType.CLOSE_POSITION,
        })
      : tx
  );

  return { transactions: updatedTransactions, txOverflown };
}
