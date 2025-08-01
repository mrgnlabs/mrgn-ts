import BigNumber from "bignumber.js";

import { PYTH_PRICE_CONF_INTERVALS, MAX_CONFIDENCE_INTERVAL_RATIO, SWB_PRICE_CONF_INTERVALS } from "../../../constants";
import { OracleSetup } from "../../bank";

import { parsePriceData } from "../../../vendor/pyth_legacy";
import { parsePriceInfo } from "../../../vendor/pyth_push_oracle";
import { AggregatorAccountData, AggregatorAccount } from "../../../vendor/switchboard_legacy";
import { decodeSwitchboardPullFeedData, SWITCHBOARD_ONDEMANDE_PRICE_PRECISION } from "../../../vendor/switchboard_pull";

import { OraclePrice, PriceWithConfidence, PriceBias } from "../types";

export function getPriceWithConfidence(oraclePrice: OraclePrice, weighted: boolean): PriceWithConfidence {
  return weighted ? oraclePrice.priceWeighted : oraclePrice.priceRealtime;
}

export function getPrice(
  oraclePrice: OraclePrice,
  priceBias: PriceBias = PriceBias.None,
  weightedPrice: boolean = false
): BigNumber {
  const price = getPriceWithConfidence(oraclePrice, weightedPrice);
  switch (priceBias) {
    case PriceBias.Lowest:
      return price.lowestPrice;
    case PriceBias.Highest:
      return price.highestPrice;
    case PriceBias.None:
      return price.price;
  }
}

function capConfidenceInterval(price: BigNumber, confidence: BigNumber, maxConfidence: BigNumber): BigNumber {
  let maxConfidenceInterval = price.times(maxConfidence);

  return BigNumber.min(confidence, maxConfidenceInterval);
}

function parseOraclePriceData(oracleSetup: OracleSetup, rawData: Buffer, shardId?: number): OraclePrice {
  const debug = require("debug")("mfi:oracle-loader");
  switch (oracleSetup) {
    case OracleSetup.PythLegacy: {
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
      const pythConfidenceRealtimeCapped = capConfidenceInterval(
        pythPriceRealtime,
        pythConfidenceRealtime,
        PYTH_PRICE_CONF_INTERVALS
      );
      const pythLowestPriceRealtime = pythPriceRealtime.minus(pythConfidenceRealtimeCapped);
      const pythHighestPriceRealtime = pythPriceRealtime.plus(pythConfidenceRealtimeCapped);

      const pythPriceWeighted = new BigNumber(pythPriceData.emaPrice.value);
      const pythConfIntervalWeighted = new BigNumber(pythPriceData.emaConfidence.value).times(
        PYTH_PRICE_CONF_INTERVALS
      );
      const pythConfIntervalWeightedCapped = capConfidenceInterval(
        pythPriceWeighted,
        pythConfIntervalWeighted,
        PYTH_PRICE_CONF_INTERVALS
      );
      const pythLowestPrice = pythPriceWeighted.minus(pythConfIntervalWeightedCapped);
      const pythHighestPrice = pythPriceWeighted.plus(pythConfIntervalWeightedCapped);

      debug(
        "Loaded pyth price rt=%s (+/- %s), w=%s (+/- %s)",
        pythPriceRealtime.toString(),
        pythConfidenceRealtimeCapped.toString(),
        pythPriceWeighted.toString(),
        pythConfIntervalWeightedCapped.toString()
      );

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
        timestamp: new BigNumber(Number(pythPriceData.timestamp)),
        pythShardId: shardId,
      };
    }
    case OracleSetup.PythPushOracle:
    case OracleSetup.StakedWithPythPush: {
      let bytesWithoutDiscriminator = rawData.slice(8);
      let data = parsePriceInfo(bytesWithoutDiscriminator);

      const exponent = new BigNumber(10 ** data.priceMessage.exponent);

      const priceRealTime = new BigNumber(Number(data.priceMessage.price)).times(exponent);
      const confidenceRealTime = new BigNumber(Number(data.priceMessage.conf))
        .times(exponent)
        .times(PYTH_PRICE_CONF_INTERVALS);
      const cappedConfidenceRealTime = capConfidenceInterval(
        priceRealTime,
        confidenceRealTime,
        MAX_CONFIDENCE_INTERVAL_RATIO
      );
      const lowestPriceRealTime = priceRealTime.minus(cappedConfidenceRealTime);
      const highestPriceRealTime = priceRealTime.plus(cappedConfidenceRealTime);

      const priceTimeWeighted = new BigNumber(Number(data.priceMessage.emaPrice)).times(exponent);
      const confidenceTimeWeighted = new BigNumber(Number(data.priceMessage.emaConf))
        .times(exponent)
        .times(PYTH_PRICE_CONF_INTERVALS);
      const cappedConfidenceWeighted = capConfidenceInterval(
        priceTimeWeighted,
        confidenceTimeWeighted,
        MAX_CONFIDENCE_INTERVAL_RATIO
      );
      const lowestPriceWeighted = priceTimeWeighted.minus(cappedConfidenceWeighted);
      const highestPriceWeighted = priceTimeWeighted.plus(cappedConfidenceWeighted);

      return {
        priceRealtime: {
          price: priceRealTime,
          confidence: cappedConfidenceRealTime,
          lowestPrice: lowestPriceRealTime,
          highestPrice: highestPriceRealTime,
        },
        priceWeighted: {
          price: priceTimeWeighted,
          confidence: cappedConfidenceWeighted,
          lowestPrice: lowestPriceWeighted,
          highestPrice: highestPriceWeighted,
        },
        timestamp: new BigNumber(Number(data.priceMessage.publishTime)),
        pythShardId: shardId,
      };
    }

    case OracleSetup.SwitchboardV2: {
      const aggData = AggregatorAccountData.decode(rawData);

      const swbPrice = new BigNumber(AggregatorAccount.decodeLatestValue(aggData)!.toString());
      const swbConfidence = new BigNumber(aggData.latestConfirmedRound.stdDeviation.toBig().toString()).times(
        SWB_PRICE_CONF_INTERVALS
      );
      const swbConfidenceCapped = capConfidenceInterval(swbPrice, swbConfidence, MAX_CONFIDENCE_INTERVAL_RATIO);
      const swbLowestPrice = swbPrice.minus(swbConfidenceCapped);
      const swbHighestPrice = swbPrice.plus(swbConfidenceCapped);

      debug(
        "Loaded swb legacy price rt=%s (+/- %s), w=%s (+/- %s)",
        swbPrice.toString(),
        swbConfidenceCapped.toString(),
        swbPrice.toString(),
        swbConfidenceCapped.toString()
      );

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
        timestamp: new BigNumber(aggData.latestConfirmedRound.roundOpenTimestamp),
      };
    }
    case OracleSetup.SwitchboardPull:
      const pullFeedDAta = decodeSwitchboardPullFeedData(rawData);

      const swbPrice = new BigNumber(pullFeedDAta.result.value.toString()).div(
        10 ** SWITCHBOARD_ONDEMANDE_PRICE_PRECISION
      );
      const swbConfidence = new BigNumber(pullFeedDAta.result.std_dev.toString()).times(SWB_PRICE_CONF_INTERVALS);
      const swbConfidenceCapped = capConfidenceInterval(swbPrice, swbConfidence, MAX_CONFIDENCE_INTERVAL_RATIO);
      const swbLowestPrice = swbPrice.minus(swbConfidenceCapped);
      const swbHighestPrice = swbPrice.plus(swbConfidenceCapped);

      debug(
        "Loaded swb pull price rt=%s (+/- %s), w=%s (+/- %s)",
        swbPrice.toString(),
        swbConfidenceCapped.toString(),
        swbPrice.toString(),
        swbConfidenceCapped.toString()
      );

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
        timestamp: new BigNumber(pullFeedDAta.last_update_timestamp.toString()),
      };
    default:
      console.error("Invalid oracle setup", oracleSetup);
      throw new Error(`Invalid oracle setup "${oracleSetup}"`);
  }
}

export { parseOraclePriceData as parsePriceInfo };
