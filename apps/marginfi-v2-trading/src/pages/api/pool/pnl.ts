import cookie from "cookie";
import { NextApiRequest, NextApiResponse } from "next";
import { PoolPnlApiResponse, PoolPnlMapApiResponse } from "~/types/api.types";

// Cache times in seconds
const S_MAXAGE_TIME = 60 * 0.5; // 30 seconds
const STALE_WHILE_REVALIDATE_TIME = 60 * 1; // 1 minute

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.MARGINFI_API_URL) {
    return res.status(500).json({ error: "API URL is not set" });
  }

  if (!process.env.MRGN_ARENA_API_KEY) {
    return res.status(500).json({ error: "API Key is not set" });
  }

  const { address } = req.query;

  try {
    const response = await fetch(`${process.env.MARGINFI_API_URL}/v1/arena/pnl/${address}`, {
      headers: {
        Accept: "application/json",
        "X-API-Key": process.env.MRGN_ARENA_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data: PoolPnlMapApiResponse = (await response.json()).data;

    const poolsArray: PoolPnlApiResponse[] = Object.entries(data).map(([group, poolData]) => ({
      group,
      ...poolData,
    }));

    // Set cache headers
    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);

    return res.status(200).json(poolsArray);
  } catch (error) {
    console.error("Error fetching pool data:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}
