import { Connection } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";

import { chunkedGetRawMultipleAccountInfoOrdered, MintLayout } from "@mrgnlabs/mrgn-common";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query, method } = req;

  const requestedMintsRaw = query.mints;

  if (method !== "GET") {
    res.status(405).json({ message: "Only GET requests are allowed" });
    return;
  }

  if (!requestedMintsRaw || typeof requestedMintsRaw !== "string") {
    return res.status(400).json({ error: "Invalid input: expected an array of mint base58-encoded addresses." });
  }

  // Set cache headers for 1 day
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400");
  res.setHeader("CDN-Cache-Control", "max-age=86400");
  res.setHeader("Vercel-CDN-Cache-Control", "max-age=86400");

  try {
    const requestedMints = requestedMintsRaw.split(",").map((mintAddress) => mintAddress.trim());

    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");
    const rawData = await chunkedGetRawMultipleAccountInfoOrdered(connection, requestedMints);

    const dataByMint: Record<
      string,
      {
        tokenProgram: string;
        decimals: number;
        mint: string;
      }
    > = {};
    rawData.forEach((raw, idx) => {
      const address = requestedMints[idx];
      const parsed = MintLayout.decode(raw.data);

      dataByMint[address] = {
        tokenProgram: raw.owner.toBase58(),
        decimals: parsed.decimals,
        mint: address,
      };
    });
    res.status(200).json(dataByMint);
  } catch (error) {
    console.error("Error fetching mint data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
