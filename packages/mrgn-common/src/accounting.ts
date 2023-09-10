import { HOURS_PER_YEAR } from "./constants";

// ================ interest rate helpers ================

/**
 * Formula source: http://www.linked8.com/blog/158-apy-to-apr-and-apr-to-apy-calculation-methodologies
 *
 * @param apy {Number} APY (i.e. 0.06 for 6%)
 * @param compoundingFrequency {Number} Compounding frequency (times a year)
 * @returns {Number} APR (i.e. 0.0582 for APY of 0.06)
 */
const apyToApr = (apy: number, compoundingFrequency = HOURS_PER_YEAR) =>
  ((1 + apy) ** (1 / compoundingFrequency) - 1) * compoundingFrequency;

/**
 * Formula source: http://www.linked8.com/blog/158-apy-to-apr-and-apr-to-apy-calculation-methodologies
 *
 * @param apr {Number} APR (i.e. 0.0582 for 5.82%)
 * @param compoundingFrequency {Number} Compounding frequency (times a year)
 * @returns {Number} APY (i.e. 0.06 for APR of 0.0582)
 */
const aprToApy = (apr: number, compoundingFrequency = HOURS_PER_YEAR) =>
  (1 + apr / compoundingFrequency) ** compoundingFrequency - 1;

function calculateInterestFromApy(principal: number, durationInYears: number, apy: number): number {
  return principal * apy * durationInYears;
}

function calculateApyFromInterest(principal: number, durationInYears: number, interest: number): number {
  return interest / (principal * durationInYears);
}

export { apyToApr, aprToApy, calculateInterestFromApy, calculateApyFromInterest };
