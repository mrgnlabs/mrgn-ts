import { NextApiResponse } from "next";
import { STATUS_BAD_REQUEST, STATUS_OK } from "@mrgnlabs/mrgn-state";
import { NextApiRequest } from "../utils";

type WalletRequest = {
  tokenAddress: string; // Comma-separated list of token addresses
};

export default async function handler(req: NextApiRequest<WalletRequest>, res: NextApiResponse) {
  const tokenAddress = req.query.tokenAddress as string;

  if (!tokenAddress) {
    return res.status(STATUS_BAD_REQUEST).json({ error: true, message: "Missing token address" });
  }

  // Encode the list of addresses to be URL-safe
  const encodedTokenList = encodeURIComponent(tokenAddress);

  // Use AbortController to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`https://public-api.birdeye.so/defi/multi_price?list_address=${encodedTokenList}`, {
      headers: {
        Accept: "application/json",
        "x-chain": "solana",
        "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Network response was not ok. Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.data) {
      throw new Error("Invalid response from Birdeye API");
    }

    return res.status(STATUS_OK).json(data.data);
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return res.status(500).json({ error: "Error fetching token prices" });
  }
}
