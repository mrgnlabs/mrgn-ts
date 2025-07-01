import { Connection, PublicKey } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";

import { fetchNativeStakeAccounts, validatorStakeGroupToDto } from "@mrgnlabs/marginfi-client-v2";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: "No address provided" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
    return res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
  }

  try {
    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");
    const addressPk = new PublicKey(address);

    const stakeAccounts = await fetchNativeStakeAccounts(connection, addressPk);
    const stakeAccountsDto = stakeAccounts.map(validatorStakeGroupToDto);
    res.status(200).json(stakeAccountsDto);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error processing request" });
  }
}
