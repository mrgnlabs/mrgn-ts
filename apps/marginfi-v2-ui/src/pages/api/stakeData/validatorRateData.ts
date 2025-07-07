import { NextApiRequest, NextApiResponse } from "next";

import { ValidatorRateData } from "@mrgnlabs/marginfi-client-v2";

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const voteAccounts = req.query.voteAccounts;

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!voteAccounts || typeof voteAccounts !== "string") {
      return res.status(400).json({ error: "Invalid input: expected a feedIds string." });
    }

    if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
      res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
      return;
    }

    if (!process.env.VALIDATOR_API_KEY) {
      return res.status(500).json({ error: "No validator API URL provided" });
    }

    const validatorVoteAccounts = voteAccounts.split(",");

    // Process sequentially with delays to avoid rate limiting
    const validatorRates: ValidatorRateData[] = [];
    for (let i = 0; i < validatorVoteAccounts.length; i++) {
      const validatorVoteAccount = validatorVoteAccounts[i];

      // Add delay between requests (except for the first one)
      if (i > 0) {
        await delay(250); // 250ms delay between requests
      }

      try {
        const validatorResponse = await fetch(`${process.env.VALIDATOR_API_KEY}/${validatorVoteAccount}`);
        if (!validatorResponse.ok) {
          validatorRates.push({
            validator: validatorVoteAccount,
            totalApy: 0,
            stakingApy: 0,
          });
        } else {
          const validatorData = await validatorResponse.json();
          validatorRates.push({
            validator: validatorVoteAccount,
            totalApy: validatorData.total_apy || 0,
            stakingApy: validatorData.staking_apy || 0,
          });
        }
      } catch (error) {
        console.error(`Error fetching data for validator ${validatorVoteAccount}:`, error);
        validatorRates.push({
          validator: validatorVoteAccount,
          totalApy: 0,
          stakingApy: 0,
        });
      }
    }

    // daily cache
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=86400");
    return res.status(200).json(validatorRates);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}
