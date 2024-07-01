import { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";

import type { TokenData } from "~/types";

const tokenCache = new NodeCache({ stdTTL: 60 }); // Cache for 1 min

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  if (!address) {
    res.status(400).json({ error: "No token provided" });
    return;
  }
  const cacheKey = `token_${address}`;

  // Check cache
  const cachedData = tokenCache.get(cacheKey);
  // if (cachedData) {
  //   console.log("using cache");
  //   res.status(200).json(cachedData);
  //   return;
  // }

  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  // Fetch from API and update cache
  try {
    const response = await fetch(`https://public-api.birdeye.so/defi/token_overview?address=${address}`, {
      headers: {
        Accept: "application/json",
        "x-chain": "solana",
        "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const { data } = await response.json();

    if (!data) {
      res.status(404).json({ error: "Token data not found" });
      return;
    }

    const tokenData: TokenData = {
      address: data.address,
      name: data.name,
      symbol: data.symbol,
      imageUrl: data.logoURI,
      decimals: data.decimals,
      price: data.price,
      priceChange24h: data.priceChange24hPercent,
      marketCap: data.mc,
      volume24h: data.v24h,
      volumeChange24h: data.v24hChangePercent,
    };

    // Store in cache
    tokenCache.set(cacheKey, tokenData);
    console.log("new data");
    res.status(200).json(tokenData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
