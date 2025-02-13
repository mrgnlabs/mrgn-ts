import type { NextApiRequest, NextApiResponse } from "next";

type ValidatorInfoResponse = {
  data?: {
    total_apy: number;
    staking_apy: number;
  };
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ValidatorInfoResponse>) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { validator } = req.query;

  if (!validator) {
    return res.status(400).json({ error: "Validator parameter is required" });
  }

  if (!process.env.VALIDATOR_API_URL) {
    return res.status(500).json({ error: "No validator API URL provided" });
  }

  try {
    const validatorResponse = await fetch(`${process.env.VALIDATOR_API_URL}/${validator}`);

    if (!validatorResponse.ok) {
      return res.status(validatorResponse.status).json({ error: "Failed to fetch validator data" });
    }

    const validatorData = await validatorResponse.json();

    res.setHeader("Cache-Control", "public, max-age=14400");
    return res.status(200).json({
      data: {
        total_apy: validatorData.total_apy || 0,
        staking_apy: validatorData.staking_apy || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch validator data" });
  }
}
