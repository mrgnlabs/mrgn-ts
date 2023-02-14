// ================ apr/apy conversions ================

export const HOURS_PER_YEAR = 365.25 * 24;

/**
 * Formula source: http://www.linked8.com/blog/158-apy-to-apr-and-apr-to-apy-calculation-methodologies
 *
 * @param apy {Number} APY (i.e. 0.06 for 6%)
 * @param compoundingFrequency {Number} Compounding frequency (times a year)
 * @returns {Number} APR (i.e. 0.0582 for APY of 0.06)
 */
export const apyToApr = (apy: number, compoundingFrequency = HOURS_PER_YEAR) =>
  ((1 + apy) ** (1 / compoundingFrequency) - 1) * compoundingFrequency;

/**
 * Formula source: http://www.linked8.com/blog/158-apy-to-apr-and-apr-to-apy-calculation-methodologies
 *
 * @param apr {Number} APR (i.e. 0.0582 for 5.82%)
 * @param compoundingFrequency {Number} Compounding frequency (times a year)
 * @returns {Number} APY (i.e. 0.06 for APR of 0.0582)
 */
export const aprToApy = (apr: number, compoundingFrequency = HOURS_PER_YEAR) =>
  (1 + apr / compoundingFrequency) ** compoundingFrequency - 1;
