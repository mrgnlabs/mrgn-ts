import { PublicKey } from "@solana/web3.js";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function GET(req: NextApiRequest, res: NextApiResponse) {
  try {
    const params = req.query;

    if (!params.address) {
      return res.status(400).json({ error: "Missing address in query" });
    }

    const mintAddress = new PublicKey(params.address as string);

    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "my-id",
        method: "getAsset",
        params: {
          id: mintAddress.toBase58(),
        },
      }),
    });
    const { result } = await response.json();

    return res.status(200).json({ ...result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred while processing your request" });
  }
}
