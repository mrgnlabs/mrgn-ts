import { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { BirdeyeMarketDataResponse } from "~/types/api.types";

const BIRDEYE_API = "https://public-api.birdeye.so";

interface BirdeyeMarketData {
  data: BirdeyeMarketDataResponse;
  success: boolean;
}

const S_MAXAGE_TIME = 60 * 10; // 10 minutes
const STALE_WHILE_REVALIDATE_TIME = 60 * 20; // 20 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  if (!address) {
    res.status(400).json({ error: "No address provided" });
    return;
  }

  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const response = await fetch(`${BIRDEYE_API}/defi/v3/token/market-data?address=${address}`, {
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
    const data: BirdeyeMarketData = await response.json();

    if (!data.success) {
      throw new Error("Birdeye API returned an error");
    }

    // 4 min cache
    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);
    res.status(200).json(data.data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
