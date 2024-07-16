import { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const myCache = new NodeCache({ stdTTL: 240 }); // Cache for 4 min
const BIRDEYE_API = "https://public-api.birdeye.so";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  if (!address) {
    res.status(400).json({ error: "No address provided" });
    return;
  }
  const cacheKey = `price-history_${address}`;

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
      `${BIRDEYE_API}/defi/history_price?address=${address}&type=1H&time_from=${timestamp24hrsAgo}&time_to=${timestampNow}`,
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
    let items: {
      timestamp: number;
      label: string;
      price: number;
    }[] = [];

    if (data.data.items) {
      items = data.data.items.map((item: any) => {
        console.log(item);
        return {
          timestamp: item.unixTime,
          label: dayjs.unix(item.unixTime).fromNow(),
          price: item.value,
        };
      });
    }

    // Store in cache
    myCache.set(cacheKey, items);

    res.status(200).json(items);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
