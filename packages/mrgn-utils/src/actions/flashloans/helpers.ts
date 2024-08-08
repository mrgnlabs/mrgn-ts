import { AddressLookupTableAccount, Connection, VersionedTransaction } from "@solana/web3.js";

import { computeLoopingParams, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import BigNumber from "bignumber.js";
import { QuoteGetRequest, QuoteResponse } from "@jup-ag/api";

import { STATIC_SIMULATION_ERRORS } from "../../errors";
import { ActionMethod } from "../types";
import { closePositionBuilder, loopingBuilder, repayWithCollatBuilder } from "./builders";
import { getSwapQuoteWithRetry } from "../helpers";
import { nativeToUi, uiToNative } from "@mrgnlabs/mrgn-common";

/*
 * Builds and verifies the size of the Looping transaction.
 */
export async function verifyTxSizeLooping(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo,
  loopingBank: ExtendedBankInfo,
  depositAmount: number,
  borrowAmount: BigNumber,
  quoteResponse: QuoteResponse,
  connection: Connection,
  isTxnSplit: boolean = false,
  priorityFee: number
): Promise<{
  flashloanTx: VersionedTransaction | null;
  bundleTipTxn: VersionedTransaction | null;
  addressLookupTableAccounts: AddressLookupTableAccount[];
  error?: ActionMethod;
}> {
  try {
    const builder = await loopingBuilder({
      marginfiAccount,
      bank,
      depositAmount,
      options: {
        loopingQuote: quoteResponse,
        borrowAmount,
        loopingBank,
        connection,
        loopingTxn: null,
        bundleTipTxn: null,
      },
      isTxnSplit,
      priorityFee,
    });

    const txCheck = verifyFlashloanTxSize(builder);
    if (!txCheck) throw Error("this should not happen");

    return txCheck;
  } catch (error) {
    console.error(error);
    return {
      flashloanTx: null,
      bundleTipTxn: null,
      addressLookupTableAccounts: [],
      error: STATIC_SIMULATION_ERRORS.TX_SIZE,
    };
  }
}

/*
 * Builds and verifies the size of the Looping transaction.
 */
export async function verifyTxSizeCloseBorrowLendPosition(
  marginfiAccount: MarginfiAccountWrapper,
  depositBank: ActiveBankInfo,
  borrowBank: ActiveBankInfo,
  quoteResponse: QuoteResponse,
  connection: Connection,
  isTxnSplit: boolean = false,
  priorityFee: number
): Promise<{
  flashloanTx: VersionedTransaction | null;
  bundleTipTxn: VersionedTransaction | null;
  addressLookupTableAccounts: AddressLookupTableAccount[];
  error?: ActionMethod;
}> {
  try {
    const builder = await closePositionBuilder({
      marginfiAccount,
      depositBank,
      borrowBank,
      quote: quoteResponse,
      connection,
      isTxnSplit,
      priorityFee,
    });

    const txCheck = verifyFlashloanTxSize(builder);
    if (!txCheck) throw Error("this should not happen");

    return txCheck;
  } catch (error) {
    console.error(error);
    return {
      flashloanTx: null,
      bundleTipTxn: null,
      addressLookupTableAccounts: [],
      error: STATIC_SIMULATION_ERRORS.CLOSE_POSITIONS_FL_FAILED,
    };
  }
}

/*
 * Builds and verifies the size of the Collat transaction.
 */
export async function verifyTxSizeCollat(
  marginfiAccount: MarginfiAccountWrapper,
  bank: ExtendedBankInfo,
  depositBank: ExtendedBankInfo,
  amount: number,
  withdrawAmount: number,
  quoteResponse: QuoteResponse,
  connection: Connection,
  priorityFee: number,
  isTxnSplit: boolean = false
): Promise<{
  flashloanTx: VersionedTransaction | null;
  bundleTipTxn: VersionedTransaction | null;
  addressLookupTableAccounts: AddressLookupTableAccount[];
  error?: ActionMethod;
}> {
  try {
    const builder = await repayWithCollatBuilder({
      marginfiAccount,
      bank,
      amount,
      options: {
        repayCollatQuote: quoteResponse,
        withdrawAmount,
        depositBank,
        connection,
        repayCollatTxn: null,
        bundleTipTxn: null,
      },
      priorityFee,
      isTxnSplit,
    });

    const txCheck = verifyFlashloanTxSize(builder);
    if (!txCheck) throw Error("this should not happen");

    return txCheck;
  } catch (error) {
    console.error(error);
    return {
      flashloanTx: null,
      bundleTipTxn: null,
      addressLookupTableAccounts: [],
      error: STATIC_SIMULATION_ERRORS.TX_SIZE,
    };
  }
}

export const verifyFlashloanTxSize = (builder: {
  flashloanTx: VersionedTransaction;
  bundleTipTxn: VersionedTransaction | null;
  addressLookupTableAccounts: AddressLookupTableAccount[];
}) => {
  try {
    const totalSize = builder.flashloanTx.message.serialize().length;
    const totalKeys = builder.flashloanTx.message.getAccountKeys({
      addressLookupTableAccounts: builder.addressLookupTableAccounts,
    }).length;
    if (totalSize > 1232 - 110 || totalKeys >= 64) {
      // signature is roughly 110 bytes
      if (totalKeys >= 64) {
        return {
          flashloanTx: null,
          bundleTipTxn: null,
          addressLookupTableAccounts: builder.addressLookupTableAccounts,
          error: STATIC_SIMULATION_ERRORS.KEY_SIZE,
        };
      } else if (totalSize > 1232 - 110) {
        return {
          flashloanTx: null,
          bundleTipTxn: null,
          addressLookupTableAccounts: builder.addressLookupTableAccounts,
          error: STATIC_SIMULATION_ERRORS.TX_SIZE,
        };
      }
    } else {
      return {
        flashloanTx: builder.flashloanTx,
        bundleTipTxn: builder.bundleTipTxn,
        addressLookupTableAccounts: builder.addressLookupTableAccounts,
        error: undefined,
      };
    }
  } catch (error) {
    return {
      flashloanTx: null,
      bundleTipTxn: null,
      addressLookupTableAccounts: builder.addressLookupTableAccounts,
      error: STATIC_SIMULATION_ERRORS.TX_SIZE,
    };
  }
};

export async function calculateMaxRepayableCollateral(
  bank: ExtendedBankInfo,
  repayBank: ExtendedBankInfo,
  slippageBps: number
) {
  const amount = repayBank.isActive && repayBank.position.isLending ? repayBank.position.amount : 0;
  let maxRepayAmount = bank.isActive ? bank?.position.amount : 0;
  const maxUsdValue = 700_000;

  if (maxRepayAmount * bank.info.oraclePrice.priceRealtime.price.toNumber() > maxUsdValue) {
    maxRepayAmount = maxUsdValue / bank.info.oraclePrice.priceRealtime.price.toNumber();
  }

  if (amount !== 0) {
    const quoteParams = {
      amount: uiToNative(amount, repayBank.info.state.mintDecimals).toNumber(),
      inputMint: repayBank.info.state.mint.toBase58(),
      outputMint: bank.info.state.mint.toBase58(),
      slippageBps: slippageBps,
      maxAccounts: 40,
      swapMode: "ExactIn",
    } as QuoteGetRequest;

    try {
      const swapQuoteInput = await getSwapQuoteWithRetry(quoteParams);

      if (!swapQuoteInput) throw new Error();

      const inputInOtherAmount = nativeToUi(swapQuoteInput.otherAmountThreshold, bank.info.state.mintDecimals);

      if (inputInOtherAmount > maxRepayAmount) {
        const quoteParams = {
          amount: uiToNative(maxRepayAmount, bank.info.state.mintDecimals).toNumber(),
          inputMint: repayBank.info.state.mint.toBase58(), // USDC
          outputMint: bank.info.state.mint.toBase58(), // JITO
          slippageBps: slippageBps,
          swapMode: "ExactOut",
        } as QuoteGetRequest;

        try {
          const swapQuoteOutput = await getSwapQuoteWithRetry(quoteParams, 2);
          if (!swapQuoteOutput) throw new Error();
          return nativeToUi(swapQuoteOutput.otherAmountThreshold, repayBank.info.state.mintDecimals) * 1.01;
        } catch (error) {
          const bankAmountUsd = maxRepayAmount * bank.info.oraclePrice.priceRealtime.price.toNumber() * 0.9998;
          const repayAmount = bankAmountUsd / repayBank.info.oraclePrice.priceRealtime.price.toNumber();
          return repayAmount;
        }
      } else {
        return amount;
      }
    } catch {
      return 0;
    }
  }
}

export function getLoopingParamsForClient(
  marginfiClient: MarginfiClient,
  depositBank: ExtendedBankInfo,
  borrowBank: ExtendedBankInfo,
  targetLeverage: number,
  amount: number,
  slippageBps: number
) {
  const principalBufferAmountUi = amount * targetLeverage * (slippageBps / 10000);
  const adjustedPrincipalAmountUi = amount - principalBufferAmountUi;

  const depositPriceInfo = marginfiClient.oraclePrices.get(depositBank.address.toBase58());
  const borrowPriceInfo = marginfiClient.oraclePrices.get(borrowBank.address.toBase58());

  if (!depositPriceInfo) throw Error(`Price info for ${depositBank.address.toBase58()} not found`);
  if (!borrowPriceInfo) throw Error(`Price info for ${borrowBank.address.toBase58()} not found`);

  const { borrowAmount, totalDepositAmount: depositAmount } = computeLoopingParams(
    adjustedPrincipalAmountUi,
    targetLeverage,
    depositBank.info.rawBank,
    borrowBank.info.rawBank,
    depositPriceInfo,
    borrowPriceInfo
  );

  const borrowAmountNative = uiToNative(borrowAmount, borrowBank.info.state.mintDecimals).toNumber();

  return { borrowAmount, depositAmount, borrowAmountNative };
}

export function getLoopingParamsForAccount(
  marginfiAccount: MarginfiAccountWrapper,
  depositBank: ExtendedBankInfo,
  borrowBank: ExtendedBankInfo,
  targetLeverage: number,
  amount: number,
  slippageBps: number
) {
  const principalBufferAmountUi = amount * targetLeverage * (slippageBps / 10000);
  const adjustedPrincipalAmountUi = amount - principalBufferAmountUi;

  const { borrowAmount, totalDepositAmount: depositAmount } = marginfiAccount.computeLoopingParams(
    adjustedPrincipalAmountUi,
    targetLeverage,
    depositBank.address,
    borrowBank.address
  );

  const borrowAmountNative = uiToNative(borrowAmount, borrowBank.info.state.mintDecimals).toNumber();

  return { borrowAmount, depositAmount, borrowAmountNative };
}
