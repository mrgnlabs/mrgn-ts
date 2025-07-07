import { NextApiResponse } from "next";

import { NextApiRequest } from "../utils";

type WalletRequest = {
  tokenAddress: string;
};

export default async function handler(req: NextApiRequest<WalletRequest>, res: NextApiResponse) {
  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(
      `https://public-api.birdeye.so/defi/price?include_liquidity=false&address=So11111111111111111111111111111111111111112`,
      {
        headers: {
          Accept: "application/json",
          "x-chain": "solana",
          "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Network response was not ok. Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.data || !data.success || !data.data.value) {
      throw new Error("Invalid response from Birdeye API");
    }

    return res.status(200).json(data.data.value);
  } catch (error) {
    console.error("Error fetching token price:", error);
    return res.status(500).json({ error: "Error fetching token price" });
  }
}
