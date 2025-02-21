import { Amount, toBigNumber } from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";

import { Bank } from "../../../models/bank";
import { OraclePrice } from "../../../models/price";

function computeMaxLeverage(depositBank: Bank, borrowBank: Bank): { maxLeverage: number; ltv: number } {
  const assetWeightInit = depositBank.config.assetWeightInit;
  const liabilityWeightInit = borrowBank.config.liabilityWeightInit;

  const ltv = assetWeightInit.div(liabilityWeightInit).toNumber();
  const maxLeverage = 1 / (1 - ltv);

  return {
    maxLeverage,
    ltv,
  };
}

function computeLoopingParams(
  principal: Amount,
  targetLeverage: number,
  depositBank: Bank,
  borrowBank: Bank,
  depositOracleInfo: OraclePrice,
  borrowOracleInfo: OraclePrice
): { borrowAmount: BigNumber; totalDepositAmount: BigNumber } {
  const initialCollateral = toBigNumber(principal);
  const { maxLeverage } = computeMaxLeverage(depositBank, borrowBank);

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

export { computeMaxLeverage, computeLoopingParams };
