import { parsePriceData } from "../vendor/pyth_legacy";
import BigNumber from "bignumber.js";
import { AggregatorAccountData, AggregatorAccount } from "../vendor/switchboard_legacy";
import { PYTH_PRICE_CONF_INTERVALS, SWB_PRICE_CONF_INTERVALS, MAX_CONFIDENCE_INTERVAL_RATIO } from "..";
import { OracleSetup } from "./bank";
import * as PythPushOracle from "../vendor/pyth_push_oracle";
import { decodeSwitchboardPullFeedData, SWITCHBOARD_ONDEMANDE_PRICE_PRECISION } from "../vendor/switchboard_pull";

interface PriceWithConfidence {
  price: BigNumber;
  confidence: BigNumber;
  lowestPrice: BigNumber;
  highestPrice: BigNumber;
}

interface OraclePrice {
  priceRealtime: PriceWithConfidence;
  priceWeighted: PriceWithConfidence;
  timestamp: BigNumber;
}

enum PriceBias {
  Lowest = 0,
  None = 1,
  Highest = 2,
}

function capConfidenceInterval(price: BigNumber, confidence: BigNumber, maxConfidence: BigNumber): BigNumber {
  let maxConfidenceInterval = price.times(maxConfidence);

  return BigNumber.min(confidence, maxConfidenceInterval);
}

function parseOraclePriceData(oracleSetup: OracleSetup, rawData: Buffer): OraclePrice {
  const debug = require("debug")("mfi:oracle-loader");
  switch (oracleSetup) {
    case OracleSetup.PythLegacy:
      {
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
        const pythConfidenceRealtimeCapped = capConfidenceInterval(pythPriceRealtime, pythConfidenceRealtime, PYTH_PRICE_CONF_INTERVALS);
        const pythLowestPriceRealtime = pythPriceRealtime.minus(pythConfidenceRealtimeCapped);
        const pythHighestPriceRealtime = pythPriceRealtime.plus(pythConfidenceRealtimeCapped);

        const pythPriceWeighted = new BigNumber(pythPriceData.emaPrice.value);
        const pythConfIntervalWeighted = new BigNumber(pythPriceData.emaConfidence.value).times(PYTH_PRICE_CONF_INTERVALS);
        const pythConfIntervalWeightedCapped = capConfidenceInterval(pythPriceWeighted, pythConfIntervalWeighted, PYTH_PRICE_CONF_INTERVALS);
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
          timestamp: new BigNumber(Number(pythPriceData.timestamp)),
        };
      }
    case OracleSetup.PythPushOracle:
      {
        let bytesWithoutDiscriminator = rawData.slice(8);
        let data = PythPushOracle.parsePriceInfo(bytesWithoutDiscriminator);

        const exponent = new BigNumber(10 ** data.priceMessage.exponent);

        const priceRealTime = new BigNumber(Number(data.priceMessage.price)).times(exponent);
        const confidenceRealTime = new BigNumber(Number(data.priceMessage.conf)).times(exponent);
        const cappedConfidenceRealTime = capConfidenceInterval(priceRealTime, confidenceRealTime, PYTH_PRICE_CONF_INTERVALS);
        const lowestPriceRealTime = priceRealTime.minus(cappedConfidenceRealTime);
        const highestPriceRealTime = priceRealTime.plus(cappedConfidenceRealTime);

        const priceTimeWeighted = new BigNumber(Number(data.priceMessage.emaPrice)).times(exponent);
        const confidenceTimeWeighted = new BigNumber(Number(data.priceMessage.emaConf)).times(exponent);
        const cappedConfidenceWeighted = capConfidenceInterval(priceTimeWeighted, confidenceTimeWeighted, PYTH_PRICE_CONF_INTERVALS);
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
        };
      }

    case OracleSetup.SwitchboardV2:
      {
        const aggData = AggregatorAccountData.decode(rawData);

        const swbPrice = new BigNumber(AggregatorAccount.decodeLatestValue(aggData)!.toString());
        const swbConfidence = new BigNumber(aggData.latestConfirmedRound.stdDeviation.toBig().toString()).times(
          SWB_PRICE_CONF_INTERVALS
        );
        const swbConfidenceCapped = capConfidenceInterval(swbPrice, swbConfidence, MAX_CONFIDENCE_INTERVAL_RATIO);
        const swbLowestPrice = swbPrice.minus(swbConfidenceCapped);
        const swbHighestPrice = swbPrice.plus(swbConfidenceCapped);

        debug("Loaded swb legacy price rt=%s (+/- %s), w=%s (+/- %s)", swbPrice.toString(), swbConfidenceCapped.toString(), swbPrice.toString(), swbConfidenceCapped.toString());

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

      const swbPrice = new BigNumber(pullFeedDAta.result.value.toString()).div(10 ** SWITCHBOARD_ONDEMANDE_PRICE_PRECISION);
      const swbConfidence = new BigNumber(pullFeedDAta.result.std_dev.toString()).times(
        SWB_PRICE_CONF_INTERVALS
      );
      const swbConfidenceCapped = capConfidenceInterval(swbPrice, swbConfidence, MAX_CONFIDENCE_INTERVAL_RATIO);
      const swbLowestPrice = swbPrice.minus(swbConfidenceCapped);
      const swbHighestPrice = swbPrice.plus(swbConfidenceCapped);

      debug("Loaded swb pull price rt=%s (+/- %s), w=%s (+/- %s)", swbPrice.toString(), swbConfidenceCapped.toString(), swbPrice.toString(), swbConfidenceCapped.toString());

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
      console.log("Invalid oracle setup", oracleSetup);
      throw new Error(`Invalid oracle setup "${oracleSetup}"`);
  }
}

export function getPriceWithConfidence(oraclePrice: OraclePrice, weighted: boolean): PriceWithConfidence {
  return weighted ? oraclePrice.priceWeighted : oraclePrice.priceRealtime;
}

export { parseOraclePriceData as parsePriceInfo, PriceBias };

export type { OraclePrice };
