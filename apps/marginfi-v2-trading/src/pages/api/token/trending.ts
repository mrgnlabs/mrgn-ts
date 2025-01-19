import { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

const BIRDEYE_API = "https://public-api.birdeye.so";

const S_MAXAGE_TIME = 60 * 60; // 1 hour
const STALE_WHILE_REVALIDATE_TIME = 60 * 30; // 30 minutes after cache expires

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const response = await fetch(`${BIRDEYE_API}/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20`, {
      headers: {
        Accept: "application/json",
        "x-chain": "solana",
        "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(500).json({ error: "Error fetching birdeye data" });
    }

    const { data: { tokens } = { tokens: undefined } } = await response.json();

    if (!tokens) {
      return res.status(500).json({ error: "Error fetching birdeye data" });
    }

    // 4 min cache
    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);
    res.status(200).json(tokens);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching trending data" });
  }
}
