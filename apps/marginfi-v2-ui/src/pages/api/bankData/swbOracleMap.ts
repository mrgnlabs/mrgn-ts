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

    const swbOracleAiDataByKey: Record<string, { feedId: string; stdev: string; rawPrice: string }> = {};

    // Parse the comma-separated list of oracle keys
    const oracleKeys = oracleKeysRaw
      .split(",")
      .map((key: string) => key.trim())
      .filter((key: string) => key.length > 0);

    // Check if we have any valid oracle keys
    if (oracleKeys.length === 0) {
      return res.status(400).json({ error: "No valid oracle keys provided." });
    }

    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);

    const oracleAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, oracleKeys);

    oracleAis.forEach((oracleAi, idx) => {
      if (!oracleAi?.data || idx >= oracleKeys.length) return;

      const oracleKey = oracleKeys[idx];
      if (!oracleKey) return;

      const { feed_hash, result } = vendor.decodeSwitchboardPullFeedData(oracleAi.data);

      const feedHash = Buffer.from(feed_hash).toString("hex");

      swbOracleAiDataByKey[oracleKey] = {
        feedId: feedHash,
        stdev: result.std_dev.toString(),
        rawPrice: result.value.toString(),
      };
    });

    res.setHeader("Cache-Control", "max-age=120, stale-while-revalidate=119");
    return res.status(200).json(swbOracleAiDataByKey);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}
