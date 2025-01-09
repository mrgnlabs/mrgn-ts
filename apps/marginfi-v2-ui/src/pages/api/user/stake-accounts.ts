import { NextApiRequest, NextApiResponse } from "next";

import { getStakeAccounts } from "@mrgnlabs/mrgn-utils";
import { Connection, PublicKey } from "@solana/web3.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  if (!address) {
    res.status(400).json({ error: "No address provided" });
    return;
  }

  try {
    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");
    const addressPk = new PublicKey(address);

    const stakeAccounts = await getStakeAccounts(connection, addressPk);

    // cache for 4 minutes
    res.setHeader("Cache-Control", "s-maxage=240, stale-while-revalidate=59");
    res.status(200).json(stakeAccounts);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
