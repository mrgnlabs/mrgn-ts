import BigNumber from "bignumber.js";
import { NextApiRequest, NextApiResponse } from "next";

import { OraclePrice, OraclePriceDto } from "@mrgnlabs/marginfi-client-v2";
import { CrossbarSimulatePayload, FeedResponse } from "@mrgnlabs/marginfi-client-v2/dist/vendor";
import { median } from "@mrgnlabs/mrgn-common";

const SWITCHBOARD_CROSSSBAR_API = process.env.SWITCHBOARD_CROSSSBAR_API || "https://crossbar.switchboard.xyz";

const S_MAXAGE_TIME = 10;
const STALE_WHILE_REVALIDATE_TIME = 15;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const feedIdsRaw = req.query.feedIds;

  if (!feedIdsRaw || typeof feedIdsRaw !== "string") {
    return res.status(400).json({ error: "Invalid input: expected an array of feed base58-encoded addresses." });
  }

  const feedHashes = feedIdsRaw.split(",").map((feedId) => feedId.trim());

  try {
    const crossbarPrices = await handleFetchCrossbarPrices(feedHashes);

    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);
    return res.status(200).json(crossbarPrices);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}

async function handleFetchCrossbarPrices(feedHashes: string[]): Promise<Record<string, OraclePriceDto>> {
  try {
    // main crossbar
    const payload: CrossbarSimulatePayload = [];
    let brokenFeeds: string[] = [];

    const { payload: mainPayload, brokenFeeds: mainBrokenFeeds } = await fetchCrossbarPrices(
      feedHashes,
      SWITCHBOARD_CROSSSBAR_API
    );

    payload.push(...mainPayload);
    brokenFeeds = mainBrokenFeeds;

    if (!mainBrokenFeeds.length) {
      return crossbarPayloadToOraclePricePerFeedHash(payload);
    }

    if (process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK) {
      // fallback crossbar
      const { payload: fallbackPayload, brokenFeeds: fallbackBrokenFeeds } = await fetchCrossbarPrices(
        brokenFeeds,
        process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK,
        process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK_USERNAME,
        process.env.SWITCHBOARD_CROSSSBAR_API_FALLBACK_BEARER
      );
      payload.push(...fallbackPayload);
      brokenFeeds = fallbackBrokenFeeds;
      if (!fallbackBrokenFeeds.length) {
        return crossbarPayloadToOraclePricePerFeedHash(payload);
      }
    }

    if (brokenFeeds.length) {
      const formattedFeeds = brokenFeeds.map((feed) => `\`${feed}\``).join(", ");
      console.log(`Couldn't fetch from crossbar feeds: ${formattedFeeds}`);
    }

    return crossbarPayloadToOraclePricePerFeedHash(payload);
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Couldn't fetch from crossbar");
  }
}

async function fetchCrossbarPrices(
  feedHashes: string[],
  endpoint: string,
  username?: string,
  bearer?: string
): Promise<{ payload: CrossbarSimulatePayload; brokenFeeds: string[] }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 8000);

  const isAuth = username && bearer;

  const isCrossbarMain = endpoint.includes("switchboard.xyz");

  const basicAuth = isAuth ? Buffer.from(`${username}:${bearer}`).toString("base64") : undefined;

  try {
    const feedHashesString = feedHashes.join(",");
    const response = await fetch(`${endpoint}/simulate/${feedHashesString}`, {
      headers: {
        Authorization: basicAuth ? `Basic ${basicAuth}` : "",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const payload = (await response.json()) as CrossbarSimulatePayload;

    const brokenFeeds = payload
      .filter((feed) => {
        const result = feed.results[0];
        return result === null || result === undefined || isNaN(Number(result));
      })
      .map((feed) => feed.feedHash);

    const finalPayload = payload.filter((feed) => !brokenFeeds.includes(feed.feedHash));

    return { payload: finalPayload, brokenFeeds: brokenFeeds };
  } catch (error) {
    const errorMessage = isCrossbarMain ? "Couldn't fetch from crossbar" : "Couldn't fetch from fallback crossbar";
    console.log("Error:", errorMessage);
    return { payload: [], brokenFeeds: feedHashes };
  }
}

function crossbarPayloadToOraclePricePerFeedHash(payload: CrossbarSimulatePayload): Record<string, OraclePriceDto> {
  const oraclePrices: Record<string, OraclePriceDto> = {};
  for (const feedResponse of payload) {
    const oraclePrice = crossbarFeedResultToOraclePrice(feedResponse);
    oraclePrices[feedResponse.feedHash] = stringifyOraclePrice(oraclePrice);
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

function stringifyOraclePrice(oraclePrice: OraclePrice): OraclePriceDto {
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
