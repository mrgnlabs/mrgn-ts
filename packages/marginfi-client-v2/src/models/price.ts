import { parsePriceData } from "../vendor/pyth";
import BigNumber from "bignumber.js";
import { AggregatorAccountData, AggregatorAccount } from "../vendor/switchboard";
import { PYTH_PRICE_CONF_INTERVALS, SWB_PRICE_CONF_INTERVALS } from "..";
import { OracleSetup } from "./bank";

interface PriceWithConfidence {
  price: BigNumber;
  confidence: BigNumber;
  lowestPrice: BigNumber;
  highestPrice: BigNumber;
}

interface OraclePrice {
  priceRealtime: PriceWithConfidence;
  priceWeighted: PriceWithConfidence;
}

enum PriceBias {
  Lowest = 0,
  None = 1,
  Highest = 2,
}

function parseOraclePriceData(oracleSetup: OracleSetup, rawData: Buffer): OraclePrice {
  const debug = require("debug")("mfi:oracle-loader");
  switch (oracleSetup) {
    case OracleSetup.PythEma:
      const pythPriceData = parsePriceData(rawData);

      let priceData = pythPriceData.price;
      if (priceData === undefined) {
        priceData = pythPriceData.previousPrice;
      }

      let confidenceData = pythPriceData.confidence;
      if (confidenceData === undefined) {
        confidenceData = pythPriceData.previousConfidence;
      }

      const pythPriceRealtime = new BigNumber(priceData!);
      const pythConfidenceRealtime = new BigNumber(confidenceData!);
      const pythLowestPriceRealtime = pythPriceRealtime.minus(pythConfidenceRealtime.times(PYTH_PRICE_CONF_INTERVALS));
      const pythHighestPriceRealtime = pythPriceRealtime.plus(pythConfidenceRealtime.times(PYTH_PRICE_CONF_INTERVALS));

      const pythPrice = new BigNumber(pythPriceData.emaPrice.value);
      const pythConfInterval = new BigNumber(pythPriceData.emaConfidence.value);
      const pythLowestPrice = pythPrice.minus(pythConfInterval.times(PYTH_PRICE_CONF_INTERVALS));
      const pythHighestPrice = pythPrice.plus(pythConfInterval.times(PYTH_PRICE_CONF_INTERVALS));

      debug("Loaded pyth price rt=%s, w=%s", pythPriceRealtime.toString(), pythPrice.toString());

      return {
        priceRealtime: {
          price: pythPriceRealtime,
          confidence: pythConfidenceRealtime,
          lowestPrice: pythLowestPriceRealtime,
          highestPrice: pythHighestPriceRealtime,
        },
        priceWeighted: {
          price: pythPrice,
          confidence: pythConfInterval,
          lowestPrice: pythLowestPrice,
          highestPrice: pythHighestPrice,
        },
      };

    case OracleSetup.SwitchboardV2:
      const aggData = AggregatorAccountData.decode(rawData);

      const swbPrice = new BigNumber(AggregatorAccount.decodeLatestValue(aggData)!.toString());
      const swbConfidence = new BigNumber(aggData.latestConfirmedRound.stdDeviation.toBig().toString());
      const swbLowestPrice = swbPrice.minus(swbConfidence.times(SWB_PRICE_CONF_INTERVALS));
      const swbHighestPrice = swbPrice.plus(swbConfidence.times(SWB_PRICE_CONF_INTERVALS));

      debug("Loaded pyth price rt=%s", swbPrice.toString());

      return {
        priceRealtime: {
          price: swbPrice,
          confidence: swbConfidence,
          lowestPrice: swbLowestPrice,
          highestPrice: swbHighestPrice,
        },
        priceWeighted: {
          price: swbPrice,
          confidence: swbConfidence,
          lowestPrice: swbLowestPrice,
          highestPrice: swbHighestPrice,
        },
      };

    default:
      console.log("Invalid oracle setup", oracleSetup);
      throw new Error(`Invalid oracle setup "${oracleSetup}"`);
  }
}

export function getPriceWithConfidence(oraclePrice: OraclePrice, weighted: boolean): PriceWithConfidence {
  return weighted ? oraclePrice.priceWeighted : oraclePrice.priceRealtime;
}

export { parseOraclePriceData as parsePriceInfo, PriceBias };

export type { OraclePrice };
