import BigNumber from "bignumber.js";

import { Amount, toBigNumber } from "@mrgnlabs/mrgn-common";

import { MarginRequirementType, isWeightedPrice } from "~/models/account";
import { OraclePrice, PriceBias, getPrice } from "~/services/price";

import { BankType, BankConfigType } from "../types";

export function computeMaxLeverage(
  depositBank: BankType,
  borrowBank: BankType,
  opts?: { assetWeightInit?: BigNumber; liabilityWeightInit?: BigNumber }
): { maxLeverage: number; ltv: number } {
  const assetWeightInit = opts?.assetWeightInit || depositBank.config.assetWeightInit;
  const liabilityWeightInit = opts?.liabilityWeightInit || borrowBank.config.liabilityWeightInit;

  const ltv = assetWeightInit.div(liabilityWeightInit).toNumber();
  const maxLeverage = 1 / (1 - ltv);

  return {
    maxLeverage,
    ltv,
  };
}

export function computeLoopingParams(
  principal: Amount,
  targetLeverage: number,
  depositBank: BankType,
  borrowBank: BankType,
  depositOracleInfo: OraclePrice,
  borrowOracleInfo: OraclePrice,
  opts?: { assetWeightInit?: BigNumber; liabilityWeightInit?: BigNumber }
): { borrowAmount: BigNumber; totalDepositAmount: BigNumber } {
  const initialCollateral = toBigNumber(principal);
  const { maxLeverage } = computeMaxLeverage(depositBank, borrowBank, opts);

  if (targetLeverage < 1) {
    throw Error(`Target leverage ${targetLeverage} needs to be greater than 1`);
  }

  if (targetLeverage > maxLeverage) {
    throw Error(`Target leverage ${targetLeverage} exceeds max leverage for banks ${maxLeverage}`);
  }

  const totalDepositAmount = initialCollateral.times(new BigNumber(targetLeverage));
  const additionalDepositAmount = totalDepositAmount.minus(initialCollateral);
  const borrowAmount = additionalDepositAmount
    .times(depositOracleInfo.priceWeighted.lowestPrice)
    .div(borrowOracleInfo.priceWeighted.highestPrice);

  return { borrowAmount, totalDepositAmount };
}

/** Small getters */

export function getTotalAssetQuantity(bank: BankType): BigNumber {
  return bank.totalAssetShares.times(bank.assetShareValue);
}

export function getTotalLiabilityQuantity(bank: BankType): BigNumber {
  return bank.totalLiabilityShares.times(bank.liabilityShareValue);
}

export function getAssetQuantity(bank: BankType, assetShares: BigNumber): BigNumber {
  return assetShares.times(bank.assetShareValue);
}

export function getLiabilityQuantity(bank: BankType, liabilityShares: BigNumber): BigNumber {
  return liabilityShares.times(bank.liabilityShareValue);
}

export function getAssetShares(bank: BankType, assetQuantity: BigNumber): BigNumber {
  return assetQuantity.times(bank.assetShareValue);
}

export function getLiabilityShares(bank: BankType, liabilityQuantity: BigNumber): BigNumber {
  return liabilityQuantity.times(bank.liabilityShareValue);
}

export function getAssetWeight(
  bank: BankType,
  marginRequirementType: MarginRequirementType,
  oraclePrice: OraclePrice,
  opts?: {
    ignoreSoftLimits?: boolean;
    assetWeightInitOverride?: BigNumber;
  }
): BigNumber {
  const assetWeightInit = opts?.assetWeightInitOverride ?? bank.config.assetWeightInit;

  switch (marginRequirementType) {
    case MarginRequirementType.Initial:
      const isSoftLimitDisabled = bank.config.totalAssetValueInitLimit.isZero();
      if (opts?.ignoreSoftLimits || isSoftLimitDisabled) return assetWeightInit;
      const totalBankCollateralValue = computeAssetUsdValue(
        bank,
        oraclePrice,
        bank.totalAssetShares,
        MarginRequirementType.Equity,
        PriceBias.Lowest
      );
      if (totalBankCollateralValue.isGreaterThan(bank.config.totalAssetValueInitLimit)) {
        return bank.config.totalAssetValueInitLimit.div(totalBankCollateralValue).times(assetWeightInit);
      } else {
        return assetWeightInit;
      }
    case MarginRequirementType.Maintenance:
      return bank.config.assetWeightMaint;
    case MarginRequirementType.Equity:
      return new BigNumber(1);
    default:
      throw new Error("Invalid margin requirement type");
  }
}

export function getLiabilityWeight(config: BankConfigType, marginRequirementType: MarginRequirementType): BigNumber {
  switch (marginRequirementType) {
    case MarginRequirementType.Initial:
      return config.liabilityWeightInit;
    case MarginRequirementType.Maintenance:
      return config.liabilityWeightMaint;
    case MarginRequirementType.Equity:
      return new BigNumber(1);
    default:
      throw new Error("Invalid margin requirement type");
  }
}

/** Computes  */

export function computeLiabilityUsdValue(
  bank: BankType,
  oraclePrice: OraclePrice,
  liabilityShares: BigNumber,
  marginRequirementType: MarginRequirementType,
  priceBias: PriceBias
): BigNumber {
  const liabilityQuantity = getLiabilityQuantity(bank, liabilityShares);
  const liabilityWeight = getLiabilityWeight(bank.config, marginRequirementType);
  const isWeighted = isWeightedPrice(marginRequirementType);
  return computeUsdValue(bank, oraclePrice, liabilityQuantity, priceBias, isWeighted, liabilityWeight);
}

export function computeAssetUsdValue(
  bank: BankType,
  oraclePrice: OraclePrice,
  assetShares: BigNumber,
  marginRequirementType: MarginRequirementType,
  priceBias: PriceBias
): BigNumber {
  const assetQuantity = getAssetQuantity(bank, assetShares);
  const assetWeight = getAssetWeight(bank, marginRequirementType, oraclePrice);
  const isWeighted = isWeightedPrice(marginRequirementType);
  return computeUsdValue(bank, oraclePrice, assetQuantity, priceBias, isWeighted, assetWeight);
}

export function computeUsdValue(
  bank: BankType,
  oraclePrice: OraclePrice,
  quantity: BigNumber,
  priceBias: PriceBias,
  weightedPrice: boolean,
  weight?: BigNumber,
  scaleToBase: boolean = true
): BigNumber {
  const price = getPrice(oraclePrice, priceBias, weightedPrice);
  return quantity
    .times(price)
    .times(weight ?? 1)
    .dividedBy(scaleToBase ? 10 ** bank.mintDecimals : 1);
}

export function computeTvl(bank: BankType, oraclePrice: OraclePrice): BigNumber {
  return computeAssetUsdValue(
    bank,
    oraclePrice,
    bank.totalAssetShares,
    MarginRequirementType.Equity,
    PriceBias.None
  ).minus(
    computeLiabilityUsdValue(bank, oraclePrice, bank.totalLiabilityShares, MarginRequirementType.Equity, PriceBias.None)
  );
}

export function computeInterestRates(bank: BankType): {
  lendingRate: BigNumber;
  borrowingRate: BigNumber;
} {
  const { insuranceFeeFixedApr, insuranceIrFee, protocolFixedFeeApr, protocolIrFee } = bank.config.interestRateConfig;

  const fixedFee = insuranceFeeFixedApr.plus(protocolFixedFeeApr);
  const rateFee = insuranceIrFee.plus(protocolIrFee);

  const baseInterestRate = computeBaseInterestRate(bank);
  const utilizationRate = computeUtilizationRate(bank);

  const lendingRate = baseInterestRate.times(utilizationRate);
  const borrowingRate = baseInterestRate.times(new BigNumber(1).plus(rateFee)).plus(fixedFee);

  return { lendingRate, borrowingRate };
}

export function computeBaseInterestRate(bank: BankType): BigNumber {
  const { optimalUtilizationRate, plateauInterestRate, maxInterestRate } = bank.config.interestRateConfig;

  const utilizationRate = computeUtilizationRate(bank);

  if (utilizationRate.lte(optimalUtilizationRate)) {
    return utilizationRate.times(plateauInterestRate).div(optimalUtilizationRate);
  } else {
    return utilizationRate
      .minus(optimalUtilizationRate)
      .div(new BigNumber(1).minus(optimalUtilizationRate))
      .times(maxInterestRate.minus(plateauInterestRate))
      .plus(plateauInterestRate);
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
  const remainingCapacity = BigNumber.max(0, bank.config.depositLimit.minus(totalDeposits));

  const totalBorrows = getTotalLiabilityQuantity(bank);
  const remainingBorrowCapacity = BigNumber.max(0, bank.config.borrowLimit.minus(totalBorrows));

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

  const depositCapacity = remainingCapacity.minus(outstandingLendingInterest.times(2));
  const borrowCapacity = remainingBorrowCapacity.minus(outstandingBorrowInterest.times(2));

  return {
    depositCapacity,
    borrowCapacity,
  };
}
