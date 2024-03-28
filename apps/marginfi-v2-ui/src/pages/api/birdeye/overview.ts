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
  const cacheKey = `overview_${token}`;

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

  // Fetch from API and update cache
  try {
    const response = await fetch(`${BIRDEYE_API}/defi/token_overview?address=${token}`, {
      headers: {
        Accept: "application/json",
        "x-chain": "solana",
        "X-Api-Key": process.env.NEXT_PUBLIC_BIRDEYE_API_KEY || "",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();

    // Store in cache
    myCache.set(cacheKey, data);

    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
