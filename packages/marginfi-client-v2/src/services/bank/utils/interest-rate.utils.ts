import BigNumber from "bignumber.js";

import { BankType } from "../types";
import {
  getTotalAssetQuantity,
  getTotalLiabilityQuantity,
} from "./compute.utils";

export function computeInterestRates(bank: BankType): {
  lendingRate: BigNumber;
  borrowingRate: BigNumber;
} {
  const {
    insuranceFeeFixedApr,
    insuranceIrFee,
    protocolFixedFeeApr,
    protocolIrFee,
  } = bank.config.interestRateConfig;

  const fixedFee = insuranceFeeFixedApr.plus(protocolFixedFeeApr);
  const rateFee = insuranceIrFee.plus(protocolIrFee);

  const baseInterestRate = computeBaseInterestRate(bank);
  const utilizationRate = computeUtilizationRate(bank);

  const lendingRate = baseInterestRate.times(utilizationRate);
  const borrowingRate = baseInterestRate
    .times(new BigNumber(1).plus(rateFee))
    .plus(fixedFee);

  return { lendingRate, borrowingRate };
}

/**
 * Maximum value for u32
 *
 * NOTE: AI-slop
 */
const U32_MAX = 0xffffffff;

/**
 * Convert u32 encoded rate to APR percentage (0.0 to 10.0)
 * Rate is encoded as: rate / u32::MAX * 1000%
 * Example: 100% APR = 0.1 * u32::MAX
 *
 * NOTE: AI-slop
 */
function rateFromU32(rate: number): BigNumber {
  const ratio = new BigNumber(rate).div(U32_MAX);
  return ratio.times(10);
}

/**
 * Convert u32 encoded utilization to percentage (0.0 to 1.0)
 * Util is encoded as: util / u32::MAX * 100%
 * Example: 50% = 0.5 * u32::MAX
 *
 * NOTE: AI-slop
 */
function utilFromU32(util: number): BigNumber {
  return new BigNumber(util).div(U32_MAX);
}

/**
 * Linear interpolation between two points
 * Given points (startX, startY) and (endX, endY), find Y at targetX
 */
function calculateRateBetweenPoints(
  startX: BigNumber,
  startY: BigNumber,
  endX: BigNumber,
  endY: BigNumber,
  targetX: BigNumber
): BigNumber {
  // Handle edge cases
  if (endX.lte(startX)) return startY;
  if (targetX.lt(startX)) return startY;
  if (targetX.gt(endX)) return endY;
  // Program enforces that points must be ascending (or equal)
  if (endY.lt(startY)) return startY;

  const deltaX = endX.minus(startX);
  if (deltaX.isZero()) return startY;

  // Calculate interpolation
  const offset = targetX.minus(startX);
  const proportion = offset.div(deltaX);
  const deltaY = endY.minus(startY);
  const scaledDelta = deltaY.times(proportion);

  return startY.plus(scaledDelta);
}

/**
 * Compute base interest rate using the legacy 3-point curve
 */
function computeLegacyCurve(
  utilizationRate: BigNumber,
  optimalUtilizationRate: BigNumber,
  plateauInterestRate: BigNumber,
  maxInterestRate: BigNumber
): BigNumber {
  if (utilizationRate.lte(optimalUtilizationRate)) {
    return utilizationRate
      .times(plateauInterestRate)
      .div(optimalUtilizationRate);
  } else {
    return utilizationRate
      .minus(optimalUtilizationRate)
      .div(new BigNumber(1).minus(optimalUtilizationRate))
      .times(maxInterestRate.minus(plateauInterestRate))
      .plus(plateauInterestRate);
  }
}

/**
 * Compute base interest rate using the 7-point multipoint curve
 * Locates utilization on a linear function with up to 7 points:
 * - Point 1: (0%, zeroUtilRate)
 * - Points 2-6: Custom points from the points array
 * - Point 7: (100%, hundredUtilRate)
 *
 * Note: all will migrate to the new 7 point curve, the result for your normal legacy
 * curve getting migrated over is described in that test there. then we'll start creating curves with more points later
 */
function computeMultipointCurve(
  utilizationRate: BigNumber,
  zeroUtilRate: number,
  hundredUtilRate: number,
  points: Array<{ util: number; rate: number }>
): BigNumber {
  const zeroRate = rateFromU32(zeroUtilRate);
  const hundredRate = rateFromU32(hundredUtilRate);

  // clamp utilization rate to [0, 1] for safety
  const clampedUtilizationRate = BigNumber.max(
    0,
    BigNumber.min(1, utilizationRate)
  );

  // Filter out padding (where util = 0) to match on-chain behavior
  // Program enforces: no gaps, ascending order, all padding at end
  const nonPaddingPoints = points.filter((point) => point.util !== 0);

  // start from point (0%, zeroRate)
  let prevUtil = new BigNumber(0);
  let prevRate = zeroRate;

  // Iterate through non-padding custom points
  for (const point of nonPaddingPoints) {
    const pointUtil = utilFromU32(point.util);
    const pointRate = rateFromU32(point.rate);

    // If current utilization is <= this point's utilization,
    // interpolate between previous point and this point
    if (clampedUtilizationRate.lte(pointUtil)) {
      return calculateRateBetweenPoints(
        prevUtil,
        prevRate,
        pointUtil,
        pointRate,
        clampedUtilizationRate
      );
    }

    // update previous point and continue
    prevUtil = pointUtil;
    prevRate = pointRate;
  }

  // interpolate between points
  return calculateRateBetweenPoints(
    prevUtil,
    prevRate,
    new BigNumber(1),
    hundredRate,
    clampedUtilizationRate
  );
}

export function computeBaseInterestRate(bank: BankType): BigNumber {
  const interestRateConfig = bank.config.interestRateConfig;
  const utilizationRate = computeUtilizationRate(bank);
  const curveType = interestRateConfig.curveType;

  // verify 1 is indeed the only curve type for multipoint
  if (curveType === 1) {
    return computeMultipointCurve(
      utilizationRate,
      interestRateConfig.zeroUtilRate,
      interestRateConfig.hundredUtilRate,
      interestRateConfig.points
    );
  } else {
    return computeLegacyCurve(
      utilizationRate,
      interestRateConfig.optimalUtilizationRate,
      interestRateConfig.plateauInterestRate,
      interestRateConfig.maxInterestRate
    );
  }
}

export function computeUtilizationRate(bank: BankType): BigNumber {
  const assets = getTotalAssetQuantity(bank);
  const liabilities = getTotalLiabilityQuantity(bank);
  if (assets.isZero()) return new BigNumber(0);
  return liabilities.div(assets);
}

const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365.25;

export function computeRemainingCapacity(bank: BankType): {
  depositCapacity: BigNumber;
  borrowCapacity: BigNumber;
} {
  const totalDeposits = getTotalAssetQuantity(bank);
  const remainingCapacity = BigNumber.max(
    0,
    bank.config.depositLimit.minus(totalDeposits)
  );

  const totalBorrows = getTotalLiabilityQuantity(bank);
  const remainingBorrowCapacity = BigNumber.max(
    0,
    bank.config.borrowLimit.minus(totalBorrows)
  );

  const durationSinceLastAccrual = Date.now() / 1000 - bank.lastUpdate;

  const { lendingRate, borrowingRate } = computeInterestRates(bank);

  const outstandingLendingInterest = lendingRate
    .times(durationSinceLastAccrual)
    .dividedBy(SECONDS_PER_YEAR)
    .times(totalDeposits);
  const outstandingBorrowInterest = borrowingRate
    .times(durationSinceLastAccrual)
    .dividedBy(SECONDS_PER_YEAR)
    .times(totalBorrows);

  const depositCapacity = remainingCapacity.minus(
    outstandingLendingInterest.times(2)
  );
  const borrowCapacity = remainingBorrowCapacity.minus(
    outstandingBorrowInterest.times(2)
  );

  return {
    depositCapacity,
    borrowCapacity,
  };
}
