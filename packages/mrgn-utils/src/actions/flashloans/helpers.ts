import { AddressLookupTableAccount, Connection, VersionedTransaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { QuoteGetRequest, QuoteResponse } from "@jup-ag/api";

import {
  computeLoopingParams,
  MarginfiAccountWrapper,
  MarginfiClient,
  PriorityFees,
} from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ExtendedV0Transaction, nativeToUi, TransactionBroadcastType, uiToNative } from "@mrgnlabs/mrgn-common";

import { STATIC_SIMULATION_ERRORS } from "../../errors";
import { ActionMessageType, ClosePositionProps, LoopingProps, RepayWithCollatProps } from "../types";
import { closePositionBuilder, loopingBuilder, repayWithCollatBuilder } from "./builders";
import { getSwapQuoteWithRetry } from "../helpers";

// ------------------------------------------------------------------//
// Helpers //
/**
 * This file contains helper functions and utilities for handling flashloan-related actions.
 * These helpers facilitate the building, verification, and execution of flashloan transactions,
 * including looping and repaying with collateral.
 */
// ------------------------------------------------------------------//

/*
 * Builds and verifies the size of the Looping transaction.
 */
export async function verifyTxSizeLooping(props: LoopingProps): Promise<VerifyTxSizeFlashloanResponse> {
  try {
    const builder = await loopingBuilder(props);

    if (builder.txOverflown) {
      // transaction size is too large
      return {
        flashloanTx: null,
        additionalTxs: [],
        error: STATIC_SIMULATION_ERRORS.TX_SIZE,
      };
    } else {
      return {
        ...builder,
      };
    }
  } catch (error) {
    console.error(error);
    return {
      flashloanTx: null,
      additionalTxs: [],
      error: STATIC_SIMULATION_ERRORS.TX_SIZE,
    };
  }
}

/*
 * Builds and verifies the size of the Looping transaction.
 */
export async function verifyTxSizeCloseBorrowLendPosition(
  props: ClosePositionProps
): Promise<VerifyTxSizeFlashloanResponse> {
  try {
    if (Number(props.quote.priceImpactPct) > 0.05) {
      throw Error("Price impact too high");
    }

    const builder = await closePositionBuilder(props);

    if (builder.txOverflown) {
      return {
        flashloanTx: null,
        additionalTxs: [],
        error: STATIC_SIMULATION_ERRORS.TX_SIZE,
      };
    } else {
      return {
        ...builder,
      };
    }
  } catch (error) {
    console.error(error);
    return {
      flashloanTx: null,
      additionalTxs: [],
      error: STATIC_SIMULATION_ERRORS.TX_SIZE,
    };
  }
}

type VerifyTxSizeFlashloanResponse = {
  flashloanTx: ExtendedV0Transaction | null;
  additionalTxs: ExtendedV0Transaction[];
  error?: ActionMessageType;
  lastValidBlockHeight?: number;
};

/*
 * Builds and verifies the size of the Collat transaction.
 */
export async function verifyTxSizeCollat(props: RepayWithCollatProps): Promise<VerifyTxSizeFlashloanResponse> {
  try {
    const builder = await repayWithCollatBuilder(props);

    if (builder.txOverflown) {
      return {
        flashloanTx: null,
        additionalTxs: [],
        error: STATIC_SIMULATION_ERRORS.TX_SIZE,
      };
    } else {
      return {
        ...builder,
      };
    }
  } catch (error) {
    console.error(error);
    return {
      flashloanTx: null,
      additionalTxs: [],
      error: STATIC_SIMULATION_ERRORS.TX_SIZE,
    };
  }
}

/** @deprecated */
export const verifyFlashloanTxSize = (builder: {
  flashloanTx: VersionedTransaction;
  feedCrankTxs: VersionedTransaction[];
  addressLookupTableAccounts: AddressLookupTableAccount[];
  lastValidBlockHeight?: number;
}): {
  flashloanTx: VersionedTransaction | null;
  feedCrankTxs: VersionedTransaction[];
  addressLookupTableAccounts: AddressLookupTableAccount[];
  lastValidBlockHeight?: number;
  error?: ActionMessageType;
} => {
  try {
    const totalSize = builder.flashloanTx.message.serialize().length;
    const totalKeys = builder.flashloanTx.message.getAccountKeys({
      addressLookupTableAccounts: builder.addressLookupTableAccounts,
    }).length;
    if (totalSize > 1232 - 64 || totalKeys >= 64) {
      // signature is roughly 64 bytes
      if (totalKeys >= 64) {
        return {
          flashloanTx: null,
          feedCrankTxs: [],
          addressLookupTableAccounts: builder.addressLookupTableAccounts,
          error: STATIC_SIMULATION_ERRORS.KEY_SIZE,
        };
      } else if (totalSize > 1232 - 64) {
        return {
          flashloanTx: null,
          feedCrankTxs: [],
          addressLookupTableAccounts: builder.addressLookupTableAccounts,
          error: STATIC_SIMULATION_ERRORS.TX_SIZE,
        };
      }
    } else {
      return {
        flashloanTx: builder.flashloanTx,
        feedCrankTxs: builder.feedCrankTxs,
        addressLookupTableAccounts: builder.addressLookupTableAccounts,
        error: undefined,
        lastValidBlockHeight: builder.lastValidBlockHeight,
      };
    }

    return {
      flashloanTx: null,
      feedCrankTxs: [],
      addressLookupTableAccounts: builder.addressLookupTableAccounts,
      error: STATIC_SIMULATION_ERRORS.TX_SIZE,
    };
  } catch (error) {
    return {
      flashloanTx: null,
      feedCrankTxs: [],
      addressLookupTableAccounts: builder.addressLookupTableAccounts,
      error: STATIC_SIMULATION_ERRORS.TX_SIZE,
    };
  }
};

export async function calculateMaxRepayableCollateral(
  bank: ExtendedBankInfo,
  repayBank: ExtendedBankInfo,
  slippageBps: number,
  slippageMode: "DYNAMIC" | "FIXED"
) {
  if (!bank.isActive || !repayBank.isActive) return 0;

  const maxUsdValue = 700_000;

  // Fetch prices safely
  const bankPrice = bank.info.oraclePrice?.priceRealtime?.price?.toNumber();
  const repayPrice = repayBank.info.oraclePrice?.priceRealtime?.price?.toNumber();

  // Initial max repayable amount in token Y
  let maxRepayAmount = bank.position?.amount;

  // Cap max repayable amount in USD
  if (maxRepayAmount * bankPrice > maxUsdValue) {
    maxRepayAmount = maxUsdValue / bankPrice;
  }

  // If there’s no position to repay, return 0
  const repayAmountAvailable = repayBank.position?.isLending ? repayBank.position.amount : 0;
  if (repayAmountAvailable === 0) return 0;

  // First swap quote: ExactIn mode
  const initialQuoteParams = {
    amount: uiToNative(maxRepayAmount, repayBank.info.state.mintDecimals).toNumber(),
    inputMint: repayBank.info.state.mint.toBase58(),
    outputMint: bank.info.state.mint.toBase58(),
    slippageBps: slippageMode === "FIXED" ? slippageBps : undefined,
    dynamicSlippage: slippageMode === "DYNAMIC",
    maxAccounts: 40,
    swapMode: "ExactIn",
  } as QuoteGetRequest;

  try {
    const swapQuoteInput = await getSwapQuoteWithRetry(initialQuoteParams);
    if (!swapQuoteInput) throw new Error("Swap quote failed");

    // Get the expected output amount
    const inputInOtherAmount = nativeToUi(swapQuoteInput.otherAmountThreshold, bank.info.state.mintDecimals);

    // If the swap quote suggests a different amount, get an ExactOut quote
    if (inputInOtherAmount > maxRepayAmount) {
      const secondQuoteParams = {
        amount: uiToNative(maxRepayAmount, bank.info.state.mintDecimals).toNumber(),
        inputMint: repayBank.info.state.mint.toBase58(),
        outputMint: bank.info.state.mint.toBase58(),
        slippageBps: slippageMode === "FIXED" ? slippageBps : undefined,
        dynamicSlippage: slippageMode === "DYNAMIC",
        swapMode: "ExactOut",
      } as QuoteGetRequest;

      try {
        const swapQuoteOutput = await getSwapQuoteWithRetry(secondQuoteParams, 2);
        if (!swapQuoteOutput) throw new Error("Second swap quote failed");

        return nativeToUi(swapQuoteOutput.otherAmountThreshold, repayBank.info.state.mintDecimals) * 1.01;
      } catch (error) {
        console.error("Error in second swap attempt:", error);

        // Fallback calculation using USD value
        const bankAmountUsd = maxRepayAmount * bankPrice * 0.9998;
        return bankAmountUsd / repayPrice;
      }
    } else {
      return repayAmountAvailable;
    }
  } catch (error) {
    console.error("Error in first swap attempt:", error);
    return 0;
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
  const principalBufferAmountUi = amount * targetLeverage * ((slippageBps + 30) / 10000);
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
