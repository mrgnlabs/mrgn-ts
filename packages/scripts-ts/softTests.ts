import { WrappedI80F48, wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import BN from "bn.js";

/**
 * Shorthand for `assert.equal(a.toString(), b.toString())`
 * @param a
 * @param b
 */
export const assertKeysEqual = (a: PublicKey, b: PublicKey) => {
  if (a.toString() !== b.toString()) {
    throw new Error(
      `Values are not exactly equal A: ${a.toString()} b: ${b.toString()}`
    );
  }
};

/**
 * Shorthand for `assert.equal(a.toString(), PublicKey.default.toString())`
 * @param a
 */
export const assertKeyDefault = (a: PublicKey) => {
  if (a.toString() !== PublicKey.default.toString()) {
    throw new Error(`Values is not pubkey default: ${a.toString()}}`);
  }
};

/**
 * Shorthand for `assert.equal(a.toString(), b.toString())`
 * @param a - a BN
 * @param b - a BN or number
 */
export const assertBNEqual = (a: BN, b: BN | number) => {
  if (typeof b === "number") {
    b = new BN(b);
  }
  if (a.toString() !== a.toString()) {
    throw new Error(
      `Values are not exactly equal A: ${a.toString()} b: ${b.toString()}`
    );
  }
};

/**
 * Shorthand to convert I80F48 to a string and compare against a BN, number, or other WrappedI80F48
 *
 * Generally, use `assertI80F48Approx` instead if the expected value is not a whole number or zero.
 * @param a
 * @param b
 */
export const assertI80F48Equal = (
  a: WrappedI80F48,
  b: WrappedI80F48 | BN | number
) => {
  const bigA = wrappedI80F48toBigNumber(a);
  let bigB: BigNumber;

  if (typeof b === "number") {
    bigB = new BigNumber(b);
  } else if (b instanceof BN) {
    bigB = new BigNumber(b.toString());
  } else if (isWrappedI80F48(b)) {
    bigB = wrappedI80F48toBigNumber(b);
  } else {
    throw new Error("Unsupported type for comparison");
  }

  if (bigA.toString() !== bigB.toString()) {
    throw new Error(
      `Values are not exactly equal A: ${bigA.toString()} b: ${bigB.toString()}`
    );
  }
};

/**
 * Shorthand to convert I80F48 to a string and compare against a BN, number, or other WrappedI80F48 within a given tolerance
 * @param a
 * @param b
 * @param tolerance - the allowed difference between the two values (default .000001)
 */
export const assertI80F48Approx = (
  a: WrappedI80F48,
  b: WrappedI80F48 | BN | number,
  tolerance: number = 0.000001
) => {
  const bigA = wrappedI80F48toBigNumber(a);
  let bigB: BigNumber;

  if (typeof b === "number") {
    bigB = new BigNumber(b);
  } else if (b instanceof BN) {
    bigB = new BigNumber(b.toString());
  } else if (isWrappedI80F48(b)) {
    bigB = wrappedI80F48toBigNumber(b);
  } else {
    throw new Error("Unsupported type for comparison");
  }

  const diff = bigA.minus(bigB).abs();
  const allowedDifference = new BigNumber(tolerance);

  if (diff.isGreaterThan(allowedDifference)) {
    throw new Error(
      `Values are not approximately equal. A: ${bigA.toString()} B: ${bigB.toString()} 
        Difference: ${diff.toString()}, Allowed Tolerance: ${tolerance}`
    );
  }
};

/**
 * Type guard to check if a value is WrappedI80F48
 * @param value
 * @returns
 */
function isWrappedI80F48(value: any): value is WrappedI80F48 {
  return value && typeof value === "object" && Array.isArray(value.value);
}

/**
 * Shorthand for `assert.approximately(a, b, tolerance)` for two BNs. Safe from Integer overflow
 * @param a
 * @param b
 * @param tolerance
 */
export const assertBNApproximately = (
  a: BN,
  b: BN | number,
  tolerance: BN | number
) => {
  const aB = BigInt(a.toString());
  const bB = BigInt(b.toString());
  const toleranceB = BigInt(tolerance.toString());
  if (!(aB >= bB - toleranceB)) {
    throw new Error(
      `Values are not approx within ${tolerance.toString()} A: ${a.toString()} b: ${b.toString()}`
    );
  }
  if (!(aB <= bB + toleranceB)) {
    throw new Error(
      `Values are not approx within ${tolerance.toString()} A: ${a.toString()} b: ${b.toString()}`
    );
  }
};
