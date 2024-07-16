import { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";

const myCache = new NodeCache({ stdTTL: 240 }); // Cache for 4 min
const BIRDEYE_API = "https://public-api.birdeye.so";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;
  if (!token) {
    res.status(400).json({ error: "No token provided" });
    return;
  }
  const cacheKey = `price-history_${token}`;

  // Check cache
  const cachedData = myCache.get(cacheKey);
  if (cachedData) {
    res.status(200).json(cachedData);
    return;
  }

  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  const timestamp24hrsAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const timestampNow = Math.floor(Date.now() / 1000);

  // Fetch from API and update cache
  try {
    const response = await fetch(
      `${BIRDEYE_API}/defi/history_price?address=${token}&type=1H&time_from=${timestamp24hrsAgo}&time_to=${timestampNow}`,
      {
        headers: {
          Accept: "application/json",
          "x-chain": "solana",
          "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    const items = data.data.items || [];

    // Store in cache
    myCache.set(cacheKey, items);

    res.status(200).json(items);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
