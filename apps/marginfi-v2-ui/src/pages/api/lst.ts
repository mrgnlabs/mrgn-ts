import { NextApiRequest, NextApiResponse } from "next";
import NodeCache from "node-cache";
import { fetchAndParsePricesCsv } from "~/utils";

const myCache = new NodeCache({ stdTTL: 600 }); // Cache for 1 hour
const SOLANA_COMPASS_BASE_URL = "https://raw.githubusercontent.com/glitchful-dev/sol-stake-pool-apy/master/db/";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { solanaCompassKey } = req.query;

  if (!solanaCompassKey) {
    return res.status(400).json({ error: "solanaCompassKey is required" });
  }

  const cacheKey = `key_${solanaCompassKey.toString()}`;

  const cachedData = myCache.get(cacheKey);

  if (cachedData) {
    res.status(200).json(cachedData);
    return;
  }

  try {
    const solanaCompassPrices = await fetchAndParsePricesCsv(`${SOLANA_COMPASS_BASE_URL}${solanaCompassKey}.csv`);
    myCache.set(cacheKey, solanaCompassPrices);
    res.status(200).json(solanaCompassPrices);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
