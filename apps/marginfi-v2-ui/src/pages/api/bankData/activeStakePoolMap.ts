import { Connection, PublicKey } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";

import { fetchStakePoolActiveStates } from "@mrgnlabs/marginfi-client-v2";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const voteAccounts = req.query.voteAccounts;
    if (!voteAccounts || typeof voteAccounts !== "string") {
      return res.status(400).json({ error: "Invalid input: expected a feedIds string." });
    }

    if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
      res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
      return;
    }

    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);
    const feedIdMap = await fetchStakePoolActiveStates(
      connection,
      voteAccounts.split(",").map((account) => new PublicKey(account))
    );

    const feedIdRecord: Record<string, boolean> = {};

    Object.entries(feedIdMap).forEach(([key, value]) => {
      feedIdRecord[key] = value;
    });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=119");
    return res.status(200).json(feedIdRecord);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}
