import { parsePriceData } from "../vendor/pyth";
import BigNumber from "bignumber.js";
import { AggregatorAccountData, AggregatorAccount } from "../vendor/switchboard";
import { PYTH_PRICE_CONF_INTERVALS, SWB_PRICE_CONF_INTERVALS, MAX_CONFIDENCE_INTERVAL_RATIO } from "..";
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
      const pythConfidenceRealtime = new BigNumber(confidenceData!).times(PYTH_PRICE_CONF_INTERVALS);
      const maxPythConfidenceRealtime = pythPriceRealtime.times(MAX_CONFIDENCE_INTERVAL_RATIO);
      const pythConfidenceRealtimeCapped = BigNumber.min(pythConfidenceRealtime, maxPythConfidenceRealtime);
      const pythLowestPriceRealtime = pythPriceRealtime.minus(pythConfidenceRealtimeCapped);
      const pythHighestPriceRealtime = pythPriceRealtime.plus(pythConfidenceRealtimeCapped);

      const pythPriceWeighted = new BigNumber(pythPriceData.emaPrice.value);
      const pythConfIntervalWeighted = new BigNumber(pythPriceData.emaConfidence.value).times(PYTH_PRICE_CONF_INTERVALS);
      const maxPythConfidenceWeighted = pythPriceWeighted.times(MAX_CONFIDENCE_INTERVAL_RATIO);
      const pythConfIntervalWeightedCapped = BigNumber.min(pythConfIntervalWeighted, maxPythConfidenceWeighted);
      const pythLowestPrice = pythPriceWeighted.minus(pythConfIntervalWeightedCapped);
      const pythHighestPrice = pythPriceWeighted.plus(pythConfIntervalWeightedCapped);

      debug("Loaded pyth price rt=%s (+/- %s), w=%s (+/- %s)", pythPriceRealtime.toString(), pythConfidenceRealtimeCapped.toString(), pythPriceWeighted.toString(), pythConfIntervalWeightedCapped.toString());

      return {
        priceRealtime: {
          price: pythPriceRealtime,
          confidence: pythConfidenceRealtimeCapped,
          lowestPrice: pythLowestPriceRealtime,
          highestPrice: pythHighestPriceRealtime,
        },
        priceWeighted: {
          price: pythPriceWeighted,
          confidence: pythConfIntervalWeightedCapped,
          lowestPrice: pythLowestPrice,
          highestPrice: pythHighestPrice,
        },
      };

    case OracleSetup.SwitchboardV2:
      const aggData = AggregatorAccountData.decode(rawData);

      const swbPrice = new BigNumber(AggregatorAccount.decodeLatestValue(aggData)!.toString());
      const swbConfidence = new BigNumber(aggData.latestConfirmedRound.stdDeviation.toBig().toString()).times(SWB_PRICE_CONF_INTERVALS);
      const maxSwbConfidence = swbPrice.times(MAX_CONFIDENCE_INTERVAL_RATIO);
      const swbConfidenceCapped = BigNumber.min(swbConfidence, maxSwbConfidence);
      const swbLowestPrice = swbPrice.minus(swbConfidenceCapped);
      const swbHighestPrice = swbPrice.plus(swbConfidenceCapped);

      debug("Loaded swb price rt=%s (+/- %s), w=%s (+/- %s)", swbPrice.toString(), swbConfidenceCapped.toString(), swbPrice.toString(), swbConfidenceCapped.toString());

      return {
        priceRealtime: {
          price: swbPrice,
          confidence: swbConfidenceCapped,
          lowestPrice: swbLowestPrice,
          highestPrice: swbHighestPrice,
        },
        priceWeighted: {
          price: swbPrice,
          confidence: swbConfidenceCapped,
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
