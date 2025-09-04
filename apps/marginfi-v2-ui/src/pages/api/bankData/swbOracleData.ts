import { NextApiRequest, NextApiResponse } from "next";
import { vendor } from "@mrgnlabs/marginfi-client-v2";

const PRIMARY_CROSSBAR_API = process.env.PRIMARY_CROSSBAR_API || "https://crossbar.switchboard.xyz";
const FALLBACK_CROSSBAR_API = "https://crossbar.switchboard.xyz";

/**
 * Cache control constants (in seconds)
 */
const S_MAXAGE_TIME = 10;
const STALE_WHILE_REVALIDATE_TIME = 15;

/**
 * API handler for fetching Switchboard oracle data
 * @param req - Next.js API request object
 * @param res - Next.js API response object
 * @returns Oracle price data for the specified feed IDs
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const feedIdsRaw = req.query.feedIds;

  if (!feedIdsRaw || typeof feedIdsRaw !== "string") {
    return res.status(400).json({
      success: false,
      error: "Bad Request",
      message: "Invalid input: expected 'feedIds' parameter with comma-separated feed hashes",
    });
  }

  try {
    // Parse and clean the feed hash inputs
    const feedHashes = feedIdsRaw
      .split(",")
      .map((feedId) => feedId.trim())
      .filter((feedId) => feedId.length > 0);

    // Check if we have any valid feed hashes
    if (feedHashes.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "No valid feed hashes provided",
      });
    }

    // Fetch raw crossbar response
    const crossbarResponse = await fetchCrossbarData(feedHashes);

    // Set cache headers and return the response
    res.setHeader(
      "Cache-Control",
      `public, max-age=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`
    );
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(crossbarResponse);
  } catch (error: unknown) {
    console.error("Error fetching Switchboard oracle data:", error);

    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Error processing request",
    });
  }
}

/**
 * Fetch raw crossbar data with chunking and fallback retry
 */
async function fetchCrossbarData(feedHashes: string[]): Promise<Record<string, vendor.FeedResponse | undefined>> {
  // Split feed hashes into chunks of 5 (crossbar limit)
  const chunks = chunkArray(feedHashes, 5);

  // Create requests that try primary first, then fallback on failure
  const requests = chunks.map((chunk) => {
    const feedHashesString = chunk.join(",");
    return fetchChunkWithFallback(feedHashesString, chunk);
  });

  // Execute all requests in parallel
  const results = await Promise.allSettled(requests);

  // Create map with all feeds initialized to undefined
  const feedMap: Record<string, vendor.FeedResponse | undefined> = {};
  feedHashes.forEach((feedHash) => {
    feedMap[feedHash] = undefined;
  });

  // Process successful responses
  for (const result of results) {
    if (result.status === "fulfilled") {
      const { validFeeds } = result.value;

      // Set valid feeds in the map
      validFeeds.forEach((feed) => {
        feedMap[feed.feedHash] = feed;
      });

      // Broken feeds remain undefined (already set above)
    } else if (result.status === "rejected") {
      console.error("Chunk request failed:", result.reason);
    }
  }

  return feedMap;
}

/**
 * Fetch a single chunk with fallback retry logic
 */
async function fetchChunkWithFallback(
  feedHashesString: string,
  requestedFeeds: string[]
): Promise<{ validFeeds: vendor.FeedResponse[]; requestedFeeds: string[] }> {
  // Try primary endpoint first
  try {
    return await fetchSingleChunk(PRIMARY_CROSSBAR_API, feedHashesString, true, requestedFeeds);
  } catch (primaryError) {
    console.warn("Primary endpoint failed, trying fallback:", primaryError);

    // If primary fails, try fallback endpoint
    try {
      return await fetchSingleChunk(FALLBACK_CROSSBAR_API, feedHashesString, false, requestedFeeds);
    } catch (fallbackError) {
      console.error("Both primary and fallback endpoints failed:", {
        primary: primaryError,
        fallback: fallbackError,
      });
      throw fallbackError;
    }
  }
}

/**
 * Fetch a single chunk from crossbar
 */
async function fetchSingleChunk(
  endpoint: string,
  feedHashesString: string,
  isPrimary: boolean,
  requestedFeeds: string[]
): Promise<{ validFeeds: vendor.FeedResponse[]; requestedFeeds: string[] }> {
  try {
    const response = await fetch(`${endpoint}/simulate/${feedHashesString}`, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`${isPrimary ? "Primary" : "Fallback"} endpoint failed: ${response.status}`);
    }

    const payload = (await response.json()) as vendor.CrossbarSimulatePayload;

    // Check validity of crossbar response
    const brokenFeeds = payload
      .filter((feed) => {
        const result = feed.results[0];
        return result === null || result === undefined || isNaN(Number(result));
      })
      .map((feed) => feed.feedHash);

    const validFeeds = payload.filter((feed) => !brokenFeeds.includes(feed.feedHash));

    if (brokenFeeds.length > 0) {
      console.log(`Broken feeds from ${isPrimary ? "primary" : "fallback"} endpoint:`, brokenFeeds);
    }

    return { validFeeds, requestedFeeds };
  } catch (error) {
    console.error(`${isPrimary ? "Primary" : "Fallback"} crossbar chunk failed:`, error);
    throw error;
  }
}

/**
 * Split array into chunks of specified size
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
