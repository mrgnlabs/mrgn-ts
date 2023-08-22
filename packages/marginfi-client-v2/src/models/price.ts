import { parsePriceData } from "@pythnetwork/client";
import BigNumber from "bignumber.js";
import { AggregatorAccountData, AggregatorAccount } from "../vendor/switchboard";
import { PYTH_PRICE_CONF_INTERVALS, SWB_PRICE_CONF_INTERVALS } from "..";
import { OracleSetup } from "./bank";

interface OraclePrice {
  price: BigNumber;
  confidenceInterval: BigNumber;
  lowestPrice: BigNumber;
  highestPrice: BigNumber;
}

enum PriceBias {
  Lowest = 0,
  None = 1,
  Highest = 2,
}

function parseOraclePriceData(oracleSetup: OracleSetup, rawData: Buffer): OraclePrice {
  switch (oracleSetup) {
    case OracleSetup.PythEma:
      const pythPriceData = parsePriceData(rawData);

      const pythPrice = new BigNumber(pythPriceData.emaPrice.value);
      const pythConfInterval = new BigNumber(pythPriceData.emaConfidence.value);
      const pythLowestPrice = pythPrice.minus(pythConfInterval.times(PYTH_PRICE_CONF_INTERVALS));
      const pythHighestPrice = pythPrice.plus(pythConfInterval.times(PYTH_PRICE_CONF_INTERVALS));

      return {
        price: pythPrice,
        confidenceInterval: pythConfInterval,
        lowestPrice: pythLowestPrice,
        highestPrice: pythHighestPrice,
      };

    case OracleSetup.SwitchboardV2:
      const aggData = AggregatorAccountData.decode(rawData);

      const swbPrice = new BigNumber(AggregatorAccount.decodeLatestValue(aggData)!.toString());
      const swbConfidence = new BigNumber(aggData.latestConfirmedRound.stdDeviation.toBig().toString());
      const swbLowestPrice = swbPrice.minus(swbConfidence.times(SWB_PRICE_CONF_INTERVALS));
      const swbHighestPrice = swbPrice.plus(swbConfidence.times(SWB_PRICE_CONF_INTERVALS));

      return {
        price: swbPrice,
        confidenceInterval: swbConfidence,
        lowestPrice: swbLowestPrice,
        highestPrice: swbHighestPrice,
      };

    default:
      console.log("Invalid oracle setup", oracleSetup);
      throw new Error(`Invalid oracle setup "${oracleSetup}"`);
  }
}

export { parseOraclePriceData as parsePriceInfo, PriceBias };

export type { OraclePrice };
