import { Connection } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";

import { vendor } from "@mrgnlabs/marginfi-client-v2";
import { chunkedGetRawMultipleAccountInfoOrdered } from "@mrgnlabs/mrgn-common";

/*
Pyth push oracles have a specific feed id starting with 0x
*/
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const oracleKeysRaw = req.query.oracleKeys;
    if (!oracleKeysRaw || typeof oracleKeysRaw !== "string") {
      return res.status(400).json({ error: "Invalid input: expected a oracleKeys string." });
    }

    if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
      return res.status(400).json({ error: "Invalid input: expected a private rpc endpoint." });
    }

    const feedIdMap: Record<string, { feedId: string }> = {};

    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);

    const oracleKeys = oracleKeysRaw.split(",");

    const oracleAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, oracleKeys);

    oracleAis.forEach((oracleAi, idx) => {
      const feedHash = Buffer.from(vendor.decodeSwitchboardPullFeedData(oracleAi.data).feed_hash).toString("hex");
      const oracleKey = oracleKeys[idx];

      feedIdMap[oracleKey] = { feedId: feedHash };
    });

    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=599");
    return res.status(200).json(feedIdMap);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}
