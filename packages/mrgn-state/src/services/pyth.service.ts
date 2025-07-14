import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import {
  findPythPushOracleAddress,
  MARGINFI_SPONSORED_SHARD_ID,
  MAX_CONFIDENCE_INTERVAL_RATIO,
  OraclePriceDto,
  PYTH_PRICE_CONF_INTERVALS,
  PYTH_PUSH_ORACLE_ID,
  PYTH_SPONSORED_SHARD_ID,
  PythPushFeedIdMap,
  vendor,
} from "@mrgnlabs/marginfi-client-v2";
import { chunkedGetRawMultipleAccountInfoOrdered } from "@mrgnlabs/mrgn-common";

/*
 * Pyth oracle data fetching from Step.
 */

interface StepPythOracleData {
  last_updated_ts: string;
  value: string;
  confidence: string;
}

export const getStepPythOracleData = async (
  requestedPythOracleKeys: string[],
  STEP_API_KEY: string
): Promise<Record<string, OraclePriceDto>> => {
  let updatedOraclePriceByKey: Record<string, OraclePriceDto> = {};

  const response = await fetch(`https://api.step.finance/oracle/current?apiKey=${STEP_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ids: requestedPythOracleKeys,
    }),
  });

  const pythOracleData: Record<string, StepPythOracleData> = await response.json();

  for (const index in pythOracleData) {
    const oracleData = pythOracleData[index];
    let oraclePrice = parseStepPythPriceData(oracleData);

    if (oraclePrice.priceRealtime.price === "0") {
      oraclePrice = {
        ...oraclePrice,
        priceRealtime: {
          price: "0",
          confidence: "0",
          lowestPrice: "0",
          highestPrice: "0",
        },
        priceWeighted: {
          price: "0",
          confidence: "0",
          lowestPrice: "0",
          highestPrice: "0",
        },
      };
    }

    updatedOraclePriceByKey[index] = oraclePrice;
  }

  return updatedOraclePriceByKey;
};

function parseStepPythPriceData(data: StepPythOracleData): OraclePriceDto {
  function capConfidenceInterval(price: BigNumber, confidence: BigNumber, maxConfidence: BigNumber): BigNumber {
    let maxConfidenceInterval = price.times(maxConfidence);

    return BigNumber.min(confidence, maxConfidenceInterval);
  }

  const price = data.value;
  const bigNumberPrice = new BigNumber(price);
  const confidence = data.confidence;
  const bigNumberConfidence = new BigNumber(confidence);
  const timestamp = data.last_updated_ts;

  const confidenceCapped = capConfidenceInterval(bigNumberPrice, bigNumberConfidence, PYTH_PRICE_CONF_INTERVALS);

  const lowestPrice = bigNumberPrice.minus(confidenceCapped);
  const highestPrice = bigNumberPrice.plus(confidenceCapped);

  return {
    priceRealtime: {
      price: bigNumberPrice.toString(),
      confidence: confidenceCapped.toString(),
      lowestPrice: lowestPrice.toString(),
      highestPrice: highestPrice.toString(),
    },
    priceWeighted: {
      price: bigNumberPrice.toString(),
      confidence: confidenceCapped.toString(),
      lowestPrice: lowestPrice.toString(),
      highestPrice: highestPrice.toString(),
    },
    timestamp: new BigNumber(Number(timestamp)).toString(),
  };
}

/*
 * Pyth oracle data fetching from chain.
 */

export const getChainPythOracleData = async (
  requestedPythOracleKeys: string[],
  connection: Connection
): Promise<Record<string, OraclePriceDto>> => {
  let updatedOraclePriceByKey: Record<string, OraclePriceDto> = {};
  const oracleAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, requestedPythOracleKeys);

  for (const index in requestedPythOracleKeys) {
    const oracleKey = requestedPythOracleKeys[index];
    const priceDataRaw = oracleAis[index];

    let oraclePrice = parseRpcPythPriceData(priceDataRaw.data);

    if (oraclePrice.priceRealtime.price === "0") {
      oraclePrice = {
        ...oraclePrice,
        priceRealtime: {
          price: "0",
          confidence: "0",
          lowestPrice: "0",
          highestPrice: "0",
        },
        priceWeighted: {
          price: "0",
          confidence: "0",
          lowestPrice: "0",
          highestPrice: "0",
        },
      };
    }

    updatedOraclePriceByKey[oracleKey] = oraclePrice;
  }

  return updatedOraclePriceByKey;
};

function parseRpcPythPriceData(rawData: Buffer): OraclePriceDto {
  function capConfidenceInterval(price: BigNumber, confidence: BigNumber, maxConfidence: BigNumber): BigNumber {
    let maxConfidenceInterval = price.times(maxConfidence);

    return BigNumber.min(confidence, maxConfidenceInterval);
  }

  let bytesWithoutDiscriminator = rawData.slice(8);
  let data = vendor.parsePriceInfo(bytesWithoutDiscriminator);

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
      price: priceRealTime.toString(),
      confidence: cappedConfidenceRealTime.toString(),
      lowestPrice: lowestPriceRealTime.toString(),
      highestPrice: highestPriceRealTime.toString(),
    },
    priceWeighted: {
      price: priceTimeWeighted.toString(),
      confidence: cappedConfidenceWeighted.toString(),
      lowestPrice: lowestPriceWeighted.toString(),
      highestPrice: highestPriceWeighted.toString(),
    },
    timestamp: new BigNumber(Number(data.priceMessage.publishTime)).toString(),
  };
}

/*
 * Pyth feed map fetching from chain.
 */
export async function getPythFeedIdMap(feedIds: PublicKey[]): Promise<PythPushFeedIdMap> {
  const feedIdMap: PythPushFeedIdMap = new Map<string, { feedId: PublicKey; shardId?: number }>();

  const feedIdsWithAddresses = feedIds
    //   .filter((bankConfig) => parseOracleSetup(bankConfig.oracleSetup) == OracleSetup.PythPushOracle)
    .map((feedId) => {
      let feedIdBuffer = feedId.toBuffer();
      return {
        feedId: feedIdBuffer,
        addresses: [
          findPythPushOracleAddress(feedIdBuffer, PYTH_PUSH_ORACLE_ID, PYTH_SPONSORED_SHARD_ID),
          // findPythPushOracleAddress(feedIdBuffer, PYTH_PUSH_ORACLE_ID, MARGINFI_SPONSORED_SHARD_ID),
        ],
      };
    })
    .flat();

  for (let i = 0; i < feedIdsWithAddresses.length; i++) {
    const feedId = feedIdsWithAddresses[i].feedId.toString("hex");

    feedIdMap.set(feedId, { feedId: feedIdsWithAddresses[i].addresses[0], shardId: PYTH_SPONSORED_SHARD_ID });
  }

  return feedIdMap;
}
