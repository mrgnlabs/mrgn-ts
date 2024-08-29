import { OraclePrice, OracleSetup, parsePriceInfo } from "@mrgnlabs/marginfi-client-v2";
import { CrossbarSimulatePayload, decodeSwitchboardPullFeedData, FeedResponse } from "@mrgnlabs/marginfi-client-v2/dist/vendor";
import { chunkedGetRawMultipleAccountInfoOrdered, median } from "@mrgnlabs/mrgn-common";
import { Connection } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";

const myCache = new NodeCache({ stdTTL: 20 }); // Cache for 20 seconds
const SWITCHBOARD_CROSSSBAR_API = "https://crossbar.switchboard.xyz";

interface OracleData {
  oracleKey: string;
  oracleSetup: OracleSetup;
  maxAge: number;
}

interface PriceWithConfidenceString {
  price: string;
  confidence: string;
  lowestPrice: string;
  highestPrice: string;
}

interface OraclePriceString {
  priceRealtime: PriceWithConfidenceString;
  priceWeighted: PriceWithConfidenceString;
  timestamp?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // if (req.method !== "POST") {
  //   res.status(405).json({ error: "Only POST requests are allowed" });
  //   return;
  // }

  const oracleDataArray: OracleData[] = req.body;

  if (!Array.isArray(oracleDataArray) || oracleDataArray.length === 0) {
    res.status(400).json({ error: "Invalid input: expected an array of objects" });
    return;
  }

  const connection = new Connection(process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE || "");

  let cachedOracles = new Map<string, OraclePrice>();
  let oraclesToFetch: OracleData[] = [];

  oracleDataArray.forEach((oracleData) => {
    const cacheKey = `oracle_feed_${oracleData.oracleKey}`;
    const cachedData = myCache.get(cacheKey) as OraclePrice | undefined;

    if (cachedData) {
      cachedOracles.set(oracleData.oracleKey, cachedData);
    } else {
      oraclesToFetch.push(oracleData);
    }
  });

  try {
    // Fetch on-chain data for all oracles
    const oracleAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, [
      ...oraclesToFetch.map((oracleData) => oracleData.oracleKey),
    ]); // NOTE: This will break if/when we start having more than 1 oracle key per bank
    let swbPullOraclesStale: { data: OracleData; feedHash: string }[] = [];
    for (const index in oraclesToFetch) {
      const oracleData = oraclesToFetch[index];
      const cacheKey = `oracle_feed_${oracleData.oracleKey}`;
      const priceDataRaw = oracleAis[index];
      const oraclePrice = parsePriceInfo(oracleData.oracleSetup, priceDataRaw.data);

      const currentTime = Math.round(Date.now() / 1000);
      const oracleTime = oraclePrice.timestamp.toNumber();
      const isStale = currentTime - oracleTime > oracleData.maxAge;

      // If on-chain data is recent enough, use it even for SwitchboardPull oracles
      if (oracleData.oracleSetup === OracleSetup.SwitchboardPull && isStale) {
        swbPullOraclesStale.push({ data: oracleData, feedHash: Buffer.from(decodeSwitchboardPullFeedData(priceDataRaw.data).feed_hash).toString("hex") });
        continue;
      }

      myCache.set(cacheKey, oraclePrice);
      cachedOracles.set(oracleData.oracleKey, oraclePrice);
    }

    // Batch-fetch and cache price data from Crossbar for stale SwitchboardPull oracles
    const feedHashes = swbPullOraclesStale.map((value) => value.feedHash);
    const crossbarPrices = await fetchCrossbarPrices(feedHashes);

    for (const { data: { oracleKey }, feedHash } of swbPullOraclesStale) {
      const cacheKey = `oracle_feed_${oracleKey}`;
      const crossbarPrice = crossbarPrices.get(feedHash);
      if (!crossbarPrice) {
        throw new Error(`Crossbar didn't return data for ${feedHash}`);
      }

      myCache.set(cacheKey, crossbarPrice);
      cachedOracles.set(oracleKey, crossbarPrice);
    }

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }

  const updatedOracleArray = oracleDataArray.map((value, idx) => {
    const oraclePrice = cachedOracles.get(value.oracleKey)!;

    return oraclePrice;
  });

  res.status(200).json(updatedOracleArray.map(stringifyOraclePrice));
}

async function fetchCrossbarPrices(feedHashes: string[]): Promise<Map<string, OraclePrice>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const feedHashesString = feedHashes.join(",");
    const response = await fetch(`${SWITCHBOARD_CROSSSBAR_API}/simulate/${feedHashesString}`, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const payload = await response.json() as CrossbarSimulatePayload;

    return crossbarPayloadToOraclePricePerFeedHash(payload);
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Couldn't fetch from crossbar");
  }
}

function crossbarPayloadToOraclePricePerFeedHash(payload: CrossbarSimulatePayload): Map<string, OraclePrice> {
  const oraclePrices: Map<string, OraclePrice> = new Map();
  for (const feedResponse of payload) {
    const oraclePrice = crossbarFeedResultToOraclePrice(feedResponse);
    oraclePrices.set(feedResponse.feedHash, oraclePrice);
  }
  return oraclePrices;
}

function crossbarFeedResultToOraclePrice(feedResponse: FeedResponse): OraclePrice {
  let medianPrice = new BigNumber(median(feedResponse.results));

  const priceRealtime = {
    price: medianPrice,
    confidence: new BigNumber(0),
    lowestPrice: medianPrice,
    highestPrice: medianPrice,
  };

  const priceWeighted = {
    price: medianPrice,
    confidence: new BigNumber(0),
    lowestPrice: medianPrice,
    highestPrice: medianPrice,
  };

  return {
    priceRealtime,
    priceWeighted,
    timestamp: new BigNumber(Math.floor(new Date().getTime() / 1000)),
  };
}

function stringifyOraclePrice(oraclePrice: OraclePrice): OraclePriceString {
  return {
    priceRealtime: {
      price: oraclePrice.priceRealtime.price.toString(),
      confidence: oraclePrice.priceRealtime.confidence.toString(),
      lowestPrice: oraclePrice.priceRealtime.lowestPrice.toString(),
      highestPrice: oraclePrice.priceRealtime.highestPrice.toString(),
    },
    priceWeighted: {
      price: oraclePrice.priceWeighted.price.toString(),
      confidence: oraclePrice.priceWeighted.confidence.toString(),
      lowestPrice: oraclePrice.priceWeighted.lowestPrice.toString(),
      highestPrice: oraclePrice.priceWeighted.highestPrice.toString(),
    },
    timestamp: oraclePrice.timestamp.toString(),
  };
}
