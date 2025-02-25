import { AddressLookupTableAccount, VersionedTransaction } from "@solana/web3.js";
import { QuoteGetRequest } from "@jup-ag/api";

import { computeLoopingParams, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { bpsToPercentile, nativeToUi, SolanaTransaction, uiToNative } from "@mrgnlabs/mrgn-common";

import { STATIC_SIMULATION_ERRORS } from "../../errors";
import {
  ActionMessageType,
  ActionProcessingError,
  ClosePositionProps,
  LoopingProps,
  RepayWithCollatProps,
} from "../types";
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
      throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.TX_SIZE);
    } else {
      return {
        ...builder,
      };
    }
  } catch (error) {
    console.error(error);
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.TX_BUILD_FAILED);
  }
}

/*
 * Builds and verifies the size of the Looping transaction.
 */
export async function verifyTxSizeCloseBorrowLendPosition(
  props: ClosePositionProps
): Promise<VerifyTxSizeFlashloanResponse> {
  try {
    const builder = await closePositionBuilder(props);

    if (builder.txOverflown) {
      throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.TX_SIZE);
    } else {
      return {
        ...builder,
      };
    }
  } catch (error) {
    console.error(error);
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.TX_BUILD_FAILED);
  }
}

type VerifyTxSizeFlashloanResponse = {
  transactions: SolanaTransaction[];
};

/*
 * Builds and verifies the size of the Collat transaction.
 */
export async function verifyTxSizeCollat(props: RepayWithCollatProps): Promise<VerifyTxSizeFlashloanResponse> {
  try {
    const builder = await repayWithCollatBuilder(props);

    if (builder.txOverflown) {
      throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.TX_SIZE);
    } else {
      return {
        ...builder,
      };
    }
  } catch (error) {
    console.error(error);
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.TX_BUILD_FAILED);
  }
}

export async function calculateMaxRepayableCollateral(
  borrowBank: ExtendedBankInfo,
  depositBank: ExtendedBankInfo,
  slippageBps: number,
  slippageMode: "DYNAMIC" | "FIXED"
): Promise<{ amount: number; maxOverflowHit: boolean }> {
  // if the bank is not active, a bug is occurring.
  if (!depositBank.isActive || !borrowBank.isActive) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.BANK_NOT_ACTIVE_CHECK);
  }

  // if slippage mode is fixed and no slippage is provided, return 0
  if (slippageMode === "FIXED" && slippageBps === 0) {
    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.SLIPPAGE_INVALID_CHECK);
  }

  let maxOverflowHit = false;

  const depositPrice = depositBank.info.oraclePrice.priceRealtime.price.toNumber();
  const borrowPrice = borrowBank.info.oraclePrice.priceRealtime.price.toNumber();

  let depositedAmount = depositBank.position.amount;
  let borrowedAmount = borrowBank.position.amount;

  // Deposited amount in usd
  const depositedAmountUsd = depositedAmount * depositPrice;
  // Borrowed amount in usd
  let borrowedAmountUsd = borrowedAmount * borrowPrice;

  // Don't allow repaying more than 250k at once
  // Reason: jupiter routes are constrained so we don't want the user eat unnecesary slippage
  if (borrowedAmountUsd > 250_000) {
    borrowedAmount = 250_000 / borrowPrice;
    borrowedAmountUsd = 250_000;
    maxOverflowHit = true;
  }

  // If there is not enough collateral to repay the entire borrow, return the deposited amount.
  if (depositedAmountUsd < borrowedAmountUsd) {
    return { amount: depositedAmount, maxOverflowHit };
  }

  const minimalRequiredCollateral = borrowedAmountUsd / depositPrice;

  // Get slippage for max repay
  const quoteParams: QuoteGetRequest = {
    amount: uiToNative(minimalRequiredCollateral, depositBank.info.state.mintDecimals).toNumber(),
    inputMint: depositBank.info.state.mint.toBase58(),
    outputMint: borrowBank.info.state.mint.toBase58(),
    slippageBps: slippageMode === "FIXED" ? slippageBps : undefined,
    dynamicSlippage: slippageMode === "DYNAMIC",
    maxAccounts: 40,
    swapMode: "ExactIn",
  };

  try {
    const swapQuote = await getSwapQuoteWithRetry(quoteParams, 2);

    if (!swapQuote) throw new Error("Swap quote failed");

    const quoteSlippage = bpsToPercentile(swapQuote.computedAutoSlippage ?? swapQuote.slippageBps);
    const receivedCollateral = minimalRequiredCollateral * (1 + quoteSlippage);

    // Ensure we never return more than what is available
    return {
      amount: Math.min(receivedCollateral, depositedAmount),
      maxOverflowHit: maxOverflowHit,
    };
  } catch (error) {
    console.error("Failed to fetch maximum repayable collateral:", error);

    // Check for specific overflow error
    if (typeof error === "object" && error !== null && "errorCode" in error) {
      if (error.errorCode === "ROUTE_PLAN_DOES_NOT_CONSUME_ALL_THE_AMOUNT") {
        return { amount: 250_000, maxOverflowHit: true };
      }
    }

    throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.MAX_AMOUNT_CALCULATION_FAILED);
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
