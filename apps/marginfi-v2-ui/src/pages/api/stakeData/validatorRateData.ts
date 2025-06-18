import { NextApiRequest, NextApiResponse } from "next";

import { ValidatorRateData } from "@mrgnlabs/marginfi-client-v2";

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

    if (!process.env.VALIDATOR_API_URL) {
      return res.status(500).json({ error: "No validator API URL provided" });
    }

    const validatorVoteAccounts = voteAccounts.split(",");

    const validatorRates: ValidatorRateData[] = await Promise.all(
      validatorVoteAccounts.map(async (validatorVoteAccount) => {
        const validatorResponse = await fetch(`${process.env.VALIDATOR_API_URL}/${validatorVoteAccount}`);
        if (!validatorResponse.ok) {
          return {
            validator: validatorVoteAccount,
            totalApy: 0,
            stakingApy: 0,
          };
        }
        const validatorData = await validatorResponse.json();
        return {
          validator: validatorVoteAccount,
          totalApy: validatorData.total_apy || 0,
          stakingApy: validatorData.staking_apy || 0,
        };
      })
    );

    // daily cache
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=86400");
    return res.status(200).json(validatorRates);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}
