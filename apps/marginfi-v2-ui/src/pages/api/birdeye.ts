import { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";

const myCache = new NodeCache({ stdTTL: 240 }); // Cache for 1 hour
const BIRDEYE_API = "https://public-api.birdeye.so";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mintList } = req.query;
  if (!mintList) {
    res.status(400).json({ error: "No mintList provided" });
    return;
  }
  // console.log("_RECEIVED API CALL")

  const cacheKey = `multi_price_${mintList}`;

  // Check cache
  const cachedData = myCache.get(cacheKey);
  if (cachedData) {
    // console.log("_USING CACHE")
    res.status(200).json(cachedData);
    return;
  }

  // console.log("_CACHE NOT FOUND")

  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  // Fetch from API and update cache
  try {
    const response = await fetch(`${BIRDEYE_API}/defi/multi_price?list_address=${mintList}`, {
      headers: {
        Accept: "application/json",
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
