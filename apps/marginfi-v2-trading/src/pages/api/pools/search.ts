import type { NextApiRequest, NextApiResponse } from "next";

import { TOKEN_METADATA_MAP } from "~/config/trade";

interface TokenMetadata {
  symbol: string;
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  logoURI: string;
  extensions: {
    coingeckoId: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query is required" });
    }

    const response = await fetch(TOKEN_METADATA_MAP);
    if (!response.ok) {
      throw new Error("Failed to fetch token metadata");
    }

    const tokens: TokenMetadata[] = await response.json();

    const lowerCaseQuery = query.toLowerCase();

    const filteredTokens = tokens.filter((token) => {
      if (token.name.toLowerCase().includes(lowerCaseQuery) || token.symbol.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      if (query.length >= 5 && token.address.toLowerCase().includes(lowerCaseQuery)) {
        return true;
      }
      return false;
    });

    if (filteredTokens.length === 0) {
      return res.status(404).json({ error: "No matching tokens found" });
    }

    return res.status(200).json(filteredTokens);
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
