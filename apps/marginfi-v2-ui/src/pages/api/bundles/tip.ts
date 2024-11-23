import { NextApiRequest, NextApiResponse } from "next";

const JITO_API = "https://bundles.jito.wtf";

export interface TipFloorDataResponse {
  time: string;
  landed_tips_25th_percentile: number;
  landed_tips_50th_percentile: number;
  landed_tips_75th_percentile: number;
  landed_tips_95th_percentile: number;
  landed_tips_99th_percentile: number;
  ema_landed_tips_50th_percentile: number;
}

/*
  Get jito tip data for at least 50 percentile result
*/
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // use abort controller to restrict fetch to 5 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  // Fetch from API and update cache
  try {
    const response = await fetch(`${JITO_API}/api/v1/bundles/tip_floor`, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data: TipFloorDataResponse[] = await response.json();

    if (!data.length) {
      throw new Error("No data found");
    }

    // cache for 1 minutes
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=59");
    res.status(200).json(data[0]);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
