import { Address, BN } from "@coral-xyz/anchor";
import BigNumber from "bignumber.js";
import { Decimal } from "decimal.js";
import { Amount } from "./types";

export function wrappedI80F48toBigNumber({ value }: { value: BN }, scaleDecimal: number = 0): BigNumber {
  if (!value) return new BigNumber(0);

  let numbers = new Decimal(`${value.isNeg() ? "-" : ""}0b${value.abs().toString(2)}p-48`).dividedBy(
    10 ** scaleDecimal
  );
  return new BigNumber(numbers.toString());
}

export function bigNumberToWrappedI80F48(value: BigNumber, scaleDecimal: number = 0): { value: BN } {
  if (!value) return { value: new BN(0) };

  // Adjust the value by the scaleDecimal
  let adjustedValue = value.multipliedBy(10 ** scaleDecimal);

  // Multiply by 2^48 to match the precision
  let preciseValue = adjustedValue.multipliedBy(new BigNumber(2).pow(48));

  // Convert the precise value to a BN
  let bnValue = new BN(preciseValue.toFixed(0));

  // Adjust the sign
  if (value.isNegative()) {
    bnValue = bnValue.neg();
  }

  return { value: bnValue };
}

/**
 * Converts a ui representation of a token amount into its native value as `BN`, given the specified mint decimal amount (default to 6 for USDC).
 */
export function toNumber(amount: Amount): number {
  let amt: number;
  if (typeof amount === "number") {
    amt = amount;
  } else if (typeof amount === "string") {
    amt = Number(amount);
  } else {
    amt = amount.toNumber();
  }
  return amt;
}

/**
 * Converts a ui representation of a token amount into its native value as `BN`, given the specified mint decimal amount (default to 6 for USDC).
 */
export function toBigNumber(amount: Amount | BN): BigNumber {
  let amt: BigNumber;
  if (amount instanceof BigNumber) {
    amt = amount;
  } else {
    amt = new BigNumber(amount.toString());
  }
  return amt;
}

/**
 * Converts a UI representation of a token amount into its native value as `BN`, given the specified mint decimal amount (default to 6 for USDC).
 */
export function uiToNative(amount: Amount, decimals: number): BN {
  let amt = toBigNumber(amount);
  return new BN(amt.times(10 ** decimals).toFixed(0, BigNumber.ROUND_FLOOR));
}

export function uiToNativeBigNumber(amount: Amount, decimals: number): BigNumber {
  let amt = toBigNumber(amount);
  return amt.times(10 ** decimals);
}

/**
 * Converts a native representation of a token amount into its UI value as `number`, given the specified mint decimal amount.
 */
export function nativeToUi(amount: Amount | BN, decimals: number): number {
  let amt = toBigNumber(amount);
  return amt.div(10 ** decimals).toNumber();
}

// shorten the checksummed version of the input address to have 4 characters at start and end
export function shortenAddress(pubkey: Address, chars = 4): string {
  const pubkeyStr = pubkey.toString();
  return `${pubkeyStr.slice(0, chars)}...${pubkeyStr.slice(-chars)}`;
}
