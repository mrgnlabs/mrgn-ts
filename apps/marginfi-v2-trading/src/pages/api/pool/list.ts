import cookie from "cookie";
import { NextApiRequest, NextApiResponse } from "next";
import { PoolListApiResponse, PoolListApiResponseRaw } from "~/types/api.types";

// Cache times in seconds
const S_MAXAGE_TIME = 60 * 4; // 4 minutes
const STALE_WHILE_REVALIDATE_TIME = 60 * 10; // 10 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.MARGINFI_API_URL) {
    return res.status(500).json({ error: "API URL is not set" });
  }

  if (!process.env.MRGN_ARENA_API_KEY) {
    return res.status(500).json({ error: "API Key is not set" });
  }

  try {
    const response = await fetch(`${process.env.MARGINFI_API_URL}/arena/pools`, {
      headers: {
        Accept: "application/json",
        "X-API-Key": process.env.MRGN_ARENA_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const poolListData: PoolListApiResponseRaw = await response.json();
    const poolList: PoolListApiResponse[] = poolListData.data;

    // Set cache headers
    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);

    return res.status(200).json(poolList);
  } catch (error) {
    console.error("Error fetching pool data:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}
