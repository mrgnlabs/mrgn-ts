import { NextApiRequest, NextApiResponse } from "next";
import { chunkedGetRawMultipleAccountInfoOrdered, MintLayout } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";

const BIRDEYE_API = "https://public-api.birdeye.so";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mintList } = req.query;
  if (!mintList) {
    res.status(400).json({ error: "No mintList provided" });
    return;
  }

  if (!mintList || typeof mintList !== "string") {
    return res.status(400).json({ error: "Invalid input: expected an array of mint base58-encoded addresses." });
  }

  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");

    const requestedMints = mintList.split(",").map((mintAddress) => mintAddress.trim());
    const mintAis = await chunkedGetRawMultipleAccountInfoOrdered(connection, requestedMints);

    const rawMints: Record<string, { mint: string; price: number; decimals: number; tokenProgram: string }> = {};
    const emissionPriceByMint: Record<string, number> = {};

    try {
      const response = await fetch(`${BIRDEYE_API}/defi/multi_price?list_address=${mintList}`, {
        headers: {
          Accept: "application/json",
          "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Birdeye API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      if (!data || !data.data) {
        throw new Error(`Birdeye data not found`);
      }

      requestedMints.forEach((mint, i) => {
        emissionPriceByMint[mint] = data.data[mint].price;
      });
    } catch (error) {
      console.error("Error fetching emission prices from Birdeye", error);
    }

    mintAis.forEach((ai, i) => {
      if (!ai) return;
      const mint = requestedMints[i];
      const price = emissionPriceByMint[mint] ?? 0;
      const rawData = MintLayout.decode(ai.data);
      rawMints[mint] = {
        mint,
        price,
        decimals: rawData.decimals,
        tokenProgram: ai.owner.toBase58(),
      };
    });

    // cache for 20 minutes (1200 seconds)
    res.setHeader("Cache-Control", "s-maxage=1200, stale-while-revalidate=300");
    res.status(200).json(rawMints);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
