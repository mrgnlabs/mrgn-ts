import { PublicKey } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";

import { PythPushFeedIdMap } from "@mrgnlabs/marginfi-client-v2";
import { getPythFeedIdMap } from "@mrgnlabs/mrgn-state";

/*
Pyth push oracles have a specific feed id starting with 0x
*/
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const feedIds = req.query.feedIds;
    if (!feedIds || typeof feedIds !== "string") {
      return res.status(400).json({ error: "Invalid input: expected a feedIds string." });
    }

    const feedIdMap = await getPythFeedIdMap(feedIds.split(",").map((feedId) => new PublicKey(feedId)));

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=600");
    return res.status(200).json(stringifyFeedIdMap(feedIdMap));
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}

function stringifyFeedIdMap(feedIdMap: PythPushFeedIdMap) {
  let feedIdMap2: Record<string, { feedId: string; shardId?: number }> = {};

  feedIdMap.forEach((value, key) => {
    feedIdMap2[key] = { feedId: value.feedId.toBase58(), shardId: value.shardId };
  });
  return feedIdMap2;
}
