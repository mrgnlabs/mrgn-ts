import { createJupiterApiClient, QuoteGetRequest, QuoteResponse } from "@jup-ag/api";
import { AccountInfo, AddressLookupTableAccount, Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import { MarginfiAccountWrapper, MarginfiClient, PriorityFees } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  ExtendedV0Transaction,
  LUT_PROGRAM_AUTHORITY_INDEX,
  nativeToUi,
  TransactionBroadcastType,
  uiToNative,
} from "@mrgnlabs/mrgn-common";

import { deserializeInstruction, getAdressLookupTableAccounts, getSwapQuoteWithRetry } from "../helpers";
import { isWholePosition } from "../../mrgnUtils";
import {
  ActionMessageType,
  CalculateLoopingProps,
  CalculateRepayCollateralProps,
  LoopActionTxns,
  LoopingObject,
  LoopingProps,
  RepayCollatActionTxns,
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
  ...repayProps
}: CalculateRepayCollateralProps): Promise<
  | {
      repayCollatObject: RepayCollatActionTxns;
      amount: number;
    }
  | ActionMessageType
> {
  const maxRepayAmount = repayProps.borrowBank.isActive ? repayProps.borrowBank?.position.amount : 0;

  // decreased maxAccounts from [undefined, 50, 40, 30] to [50, 40, 30]
  const maxAccountsArr = [50, 40, 30];

  let firstQuote;

  for (const maxAccounts of maxAccountsArr) {
    const quoteParams = {
      amount: uiToNative(repayProps.withdrawAmount, repayProps.depositBank.info.state.mintDecimals).toNumber(),
      inputMint: repayProps.depositBank.info.state.mint.toBase58(),
      outputMint: repayProps.borrowBank.info.state.mint.toBase58(),
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
        if (txn.flashloanTx) {
          return {
            repayCollatObject: {
              actionTxn: txn.flashloanTx,
              additionalTxns: txn.additionalTxs,
              actionQuote: swapQuote,
              lastValidBlockHeight: txn.lastValidBlockHeight,
            },
            amount: amountToRepay,
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
  priorityFees,
  platformFeeBps,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  borrowBank: ActiveBankInfo;
  depositBank: ActiveBankInfo;
  slippageBps: number;
  connection: Connection;
  priorityFees: PriorityFees;
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
          priorityFees
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
  marginfiClient,
  targetLeverage,
  slippageBps,
  platformFeeBps,
  ...loopingProps
}: CalculateLoopingProps): Promise<LoopActionTxns | ActionMessageType> {
  if (!loopingProps.marginfiAccount && !marginfiClient) {
    return STATIC_SIMULATION_ERRORS.NOT_INITIALIZED;
  }

  let borrowAmount: BigNumber, depositAmount: BigNumber, borrowAmountNative: number;
  if (loopingProps.marginfiAccount) {
    const params = getLoopingParamsForAccount(
      loopingProps.marginfiAccount,
      loopingProps.depositBank,
      loopingProps.borrowBank,
      targetLeverage,
      loopingProps.depositAmount,
      slippageBps
    );
    borrowAmount = params.borrowAmount;
    depositAmount = params.depositAmount;
    borrowAmountNative = params.borrowAmountNative;
  } else {
    const params = getLoopingParamsForClient(
      marginfiClient,
      loopingProps.depositBank,
      loopingProps.borrowBank,
      targetLeverage,
      loopingProps.depositAmount,
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
  const maxAccountsArr = [40, 30];

  let firstQuote;

  for (const maxAccounts of maxAccountsArr) {
    const quoteParams = {
      amount: borrowAmountNative,
      inputMint: loopingProps.borrowBank.info.state.mint.toBase58(), // borrow
      outputMint: loopingProps.depositBank.info.state.mint.toBase58(), // deposit
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
        const minSwapAmountOutUi = nativeToUi(
          swapQuote.otherAmountThreshold,
          loopingProps.depositBank.info.state.mintDecimals
        );
        const actualDepositAmountUi = minSwapAmountOutUi + loopingProps.depositAmount;
        let txn: {
          flashloanTx: ExtendedV0Transaction | null;
          additionalTxs: ExtendedV0Transaction[];
          error?: ActionMessageType;
          lastValidBlockHeight?: number;
        } = {
          flashloanTx: null,
          additionalTxs: [],
        };

        if (loopingProps.marginfiAccount) {
          txn = await verifyTxSizeLooping({
            ...loopingProps,
            quote: swapQuote,
            borrowAmount: borrowAmount,
            actualDepositAmount: actualDepositAmountUi,
          });
        }
        if (txn.flashloanTx || !loopingProps.marginfiAccount) {
          return {
            actionTxn: txn.flashloanTx ?? null,
            additionalTxns: txn.additionalTxs,
            actionQuote: swapQuote,
            lastValidBlockHeight: txn.lastValidBlockHeight,
            actualDepositAmount: actualDepositAmountUi,
            borrowAmount: new BigNumber(borrowAmount),
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

export async function calculateLoopingTransaction(props: LoopingProps): Promise<LoopActionTxns | ActionMessageType> {
  if (props.marginfiAccount) {
    const txn = await verifyTxSizeLooping(props);

    if (!txn) {
      return STATIC_SIMULATION_ERRORS.FL_FAILED;
    } else if (txn.error) {
      return txn.error;
    } else {
      return {
        actionTxn: txn.flashloanTx,
        additionalTxns: txn.additionalTxs,
        actionQuote: props.quote,
        lastValidBlockHeight: txn.lastValidBlockHeight,
        actualDepositAmount: props.actualDepositAmount,
        borrowAmount: props.borrowAmount,
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
  depositAmount,
  borrowAmount,
  depositBank,
  borrowBank,
  quote,
  connection,
}: LoopingProps): Promise<FlashloanBuilderResponse> {
  if (!marginfiAccount) throw new Error("not initialized");

  const jupiterQuoteApi = createJupiterApiClient();
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

  const { flashloanTx, additionalTxs, txOverflown } = await marginfiAccount.makeLoopTxV2({
    depositAmount,
    borrowAmount,
    depositBankAddress: depositBank.address,
    borrowBankAddress: borrowBank.address,
    swap: {
      instructions: [swapIx],
      lookupTables: swapLUTs,
    },
    blockhash,
  });

  return { flashloanTx, additionalTxs, txOverflown, lastValidBlockHeight };
}

type FlashloanBuilderResponse = {
  flashloanTx: ExtendedV0Transaction;
  additionalTxs: ExtendedV0Transaction[];
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
  const jupiterQuoteApi = createJupiterApiClient();
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
    },
  });
  const swapIx = deserializeInstruction(swapInstruction);

  const swapLUTs: AddressLookupTableAccount[] = [];
  swapLUTs.push(...(await getAdressLookupTableAccounts(connection, addressLookupTableAddresses)));
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const { flashloanTx, additionalTxs, txOverflown } = await marginfiAccount.makeRepayWithCollatTxV2({
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

  return { flashloanTx, additionalTxs, txOverflown, lastValidBlockHeight };
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
  priorityFees,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  depositBank: ActiveBankInfo;
  borrowBank: ActiveBankInfo;
  quote: QuoteResponse;
  connection: Connection;
  isTxnSplit?: boolean;
  priorityFees: PriorityFees;
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

  // TODO: refactor
  const { flashloanTx, feedCrankTxs, addressLookupTableAccounts } = await marginfiAccount.makeRepayWithCollatTx(
    borrowBank.position.amount,
    depositBank.position.amount,
    borrowBank.address,
    depositBank.address,
    true,
    true,
    [swapIx],
    swapLUTs,
    priorityFees.bundleTipUi ?? priorityFees.priorityFeeMicro,
    isTxnSplit
  );

  return { flashloanTx, feedCrankTxs, addressLookupTableAccounts };
}
