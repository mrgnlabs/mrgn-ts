import { Address, BN } from "@coral-xyz/anchor";
import BigNumber from "bignumber.js";
import { Decimal } from "decimal.js";
import { Amount, WrappedI80F48 } from "../types";
import { PublicKey } from "@solana/web3.js";

const I80F48_FRACTIONAL_BYTES = 6;
const I80F48_TOTAL_BYTES = 16;
const I80F48_DIVISOR = new Decimal(2).pow(8 * I80F48_FRACTIONAL_BYTES);

export function wrappedI80F48toBigNumber(wrapped: WrappedI80F48): BigNumber {
  let bytesLE = wrapped.value;
  if (bytesLE.length !== I80F48_TOTAL_BYTES) {
    throw new Error(`Expected a ${I80F48_TOTAL_BYTES}-byte buffer`);
  }

  let bytesBE = bytesLE.slice();
  bytesBE.reverse();

  let signChar = "";
  const msb = bytesBE[0];
  if (msb & 0x80) {
    signChar = "-";
    bytesBE = bytesBE.map((v) => ~v & 0xff);
  }

  let hex = signChar + "0x" + bytesBE.map((v) => v.toString(16).padStart(2, "0")).join("");
  let decoded = new Decimal(hex).dividedBy(I80F48_DIVISOR);

  return new BigNumber(decoded.toString());
}

export function bigNumberToWrappedI80F48(value: Amount): WrappedI80F48 {
  let decimalValue = new Decimal(value.toString());
  const isNegative = decimalValue.isNegative();

  decimalValue = decimalValue.times(I80F48_DIVISOR);
  let wrappedValue = new BN(decimalValue.round().toFixed()).toArray();

  if (wrappedValue.length < I80F48_TOTAL_BYTES) {
    const padding = Array(I80F48_TOTAL_BYTES - wrappedValue.length).fill(0);
    wrappedValue.unshift(...padding);
  }

  if (isNegative) {
    wrappedValue[wrappedValue.length - 1] |= 0x80;
    wrappedValue = wrappedValue.map((v) => ~v & 0xff);
  }

  wrappedValue.reverse();

  return { value: wrappedValue };
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

/**
 * Converts basis points (bps) to a decimal percentage value.
 */
export function bpsToPercentile(bps: number): number {
  return bps / 10000;
}

/**
 * Prepares transaction remaining accounts by processing bank-oracle groups:
 * 1. Sorts groups in descending order by bank public key (pushes inactive accounts to end)
 * 2. Flattens the structure into a single public key array
 *
 * Stable on most JS implementations (this shouldn't matter since we do not generally have duplicate
 * banks), in place, and uses the raw 32-byte value to sort in byte-wise lexicographical order (like
 * Rust's b.key.cmp(&a.key))
 *
 * @param banksAndOracles - Array where each element is a bank-oracle group: [bankPubkey,
 *                          oracle1Pubkey, oracle2Pubkey?, ...] Note: SystemProgram keys (111..111)
 *                          represent inactive accounts
 * @returns Flattened array of public keys with inactive accounts at the end, ready for transaction
 *          composition
 */
export const composeRemainingAccounts = (banksAndOracles: PublicKey[][]): PublicKey[] => {
  banksAndOracles.sort((a, b) => {
    const A = a[0].toBytes();
    const B = b[0].toBytes();
    // find the first differing byte
    for (let i = 0; i < 32; i++) {
      if (A[i] !== B[i]) {
        // descending: bigger byte should come first
        return B[i] - A[i];
      }
    }
    return 0; // identical keys
  });

  // flatten out [bank, oracle…, oracle…] → [bank, oracle…, bank, oracle…, …]
  return banksAndOracles.flat();
};
