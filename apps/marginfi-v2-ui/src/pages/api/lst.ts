import type { NextApiRequest, NextApiResponse } from "next";

import { LST_MINT, LSTOverview } from "~/components/common/Stake";

type ValidatorAPYResponse = {
  data?: LSTOverview;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ValidatorAPYResponse>) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const data = {
    volume: 0,
    volumeUsd: 0,
    tvl: 0,
    apy: 0,
  };

  if (!process.env.VALIDATOR_API_URL) {
    return res.status(500).json({ error: "No validator API URL provided" });
  }

  const validatorResponse = await fetch(
    process.env.VALIDATOR_API_URL! + "/mrgn4t2JabSgvGnrCaHXMvz8ocr4F52scsxJnkQMQsQ"
  );

  if (validatorResponse.ok) {
    const validatorData = await validatorResponse.json();
    data.apy = validatorData.total_apy || 0;
  }

  const birdeyeResponse = await fetch(
    `https://public-api.birdeye.so/defi/token_overview?address=${LST_MINT.toBase58()}`,
    {
      headers: {
        Accept: "application/json",
        "x-chain": "solana",
        "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
      },
    }
  );

  if (birdeyeResponse.ok) {
    const birdeyeData = await birdeyeResponse.json();
    data.volume = birdeyeData.data.v24h || 0;
    data.volumeUsd = birdeyeData.data.v24hUSD || 0;
    data.tvl = birdeyeData.data.liquidity || 0;
  }

  res.setHeader("Cache-Control", "public, max-age=14400");
  return res.status(200).json({
    data,
  });
}
