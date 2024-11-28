import { getCalculatedPrioritizationFeeByPercentile } from "@mrgnlabs/mrgn-common";
import { Connection } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";

const enum PriotitizationFeeLevels {
  LOW = 2500,
  MEDIAN = 5000,
  HIGH = 7500,
  MAX = 10000,
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

  const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");

  // Fetch from API and update cache
  try {
    const data = await getCalculatedPrioritizationFeeByPercentile(
      connection,
      {
        lockedWritableAccounts: [], // TODO: investigate this
        percentile: PriotitizationFeeLevels.HIGH,
        fallback: false,
      },
      20
    );

    clearTimeout(timeoutId);

    // cache for 4 minutes
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=59");
    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
