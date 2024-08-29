import { OraclePrice, OracleSetup, parsePriceInfo } from "@mrgnlabs/marginfi-client-v2";
import { decodeSwitchboardPullFeedData } from "@mrgnlabs/marginfi-client-v2/dist/vendor";
import { chunkedGetRawMultipleAccountInfoOrdered } from "@mrgnlabs/mrgn-common";
import { Connection } from "@solana/web3.js";
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
    const allAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, [
      ...oraclesToFetch.map((oracleData) => oracleData.oracleKey),
    ]); // NOTE: This will break if/when we start having more than 1 oracle key per bank

    const oracleAis = allAis.splice(0, oraclesToFetch.length);

    for (const index in oraclesToFetch) {
      const oracleData = oraclesToFetch[index];
      const cacheKey = `oracle_feed_${oracleData.oracleKey}`;
      const priceDataRaw = oracleAis[index];

      const oraclePrice = parsePriceInfo(oracleData.oracleSetup, priceDataRaw.data);

      const currentTime = Math.round(Date.now() / 1000);
      const oracleTime = Math.round(oraclePrice.timestamp ? oraclePrice.timestamp.toNumber() : new Date().getTime());
      const isStale = currentTime - oracleTime > oracleData.maxAge;

      if (!isStale || oracleData.oracleSetup !== OracleSetup.SwitchboardPull) {
        myCache.set(cacheKey, oraclePrice);
        cachedOracles.set(oracleData.oracleKey, oraclePrice);
      } else {
        const feedHash = Buffer.from(decodeSwitchboardPullFeedData(priceDataRaw.data)).toString("hex");

        try {
          const crossbarPrice = await fetchCrossbarPrice(feedHash);

          myCache.set(cacheKey, crossbarPrice);
          cachedOracles.set(oracleData.oracleKey, oraclePrice);
        } catch (error) {
          // fallback if crossbar fails
          myCache.set(cacheKey, oraclePrice);
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }

  const updatedOracleArray = oracleDataArray.map((value, idx) => {
    const oraclePrice = cachedOracles.get(value.oracleKey)!;

    return oraclePrice;
  });

  const stringyfiedArray = updatedOracleArray.map((oraclePrice) => ({
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
    timestamp: oraclePrice.timestamp?.toString(),
  }));

  res.status(200).json(stringyfiedArray);
}

async function fetchCrossbarPrice(feedHash: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const response = await fetch(`${SWITCHBOARD_CROSSSBAR_API}/simulate/${feedHash}`, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();

    throw new Error("TODO format price from crossbar");
    // TODO manipulate the data once we get stddev

    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Couldn't fetch from crossbar");
  }
}
