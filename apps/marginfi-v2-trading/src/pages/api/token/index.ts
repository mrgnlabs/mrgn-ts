import { NextApiRequest, NextApiResponse } from "next";

const BIRDEYE_API = "https://public-api.birdeye.so";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mintList } = req.query;
  if (!mintList) {
    res.status(400).json({ error: "No mintList provided" });
    return;
  }

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
        "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();

    // cache for 4 minutes
    res.setHeader("Cache-Control", "s-maxage=240, stale-while-revalidate=59");
    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
