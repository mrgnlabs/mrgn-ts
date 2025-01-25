import { NextApiResponse } from "next";
import { STATUS_BAD_REQUEST, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";
import { NextApiRequest } from "../utils";

type WalletRequest = {
  wallet: string;
  tokenList?: string;
};

type Token = {
  name: string;
  symbol: string;
  price: number;
  total: number;
};

export default async function handler(req: NextApiRequest<WalletRequest>, res: NextApiResponse) {
  const ownerAddress = req.query.wallet as string;
  const tokenList = req.query.tokenList ? Boolean(req.query.tokenList) : false;

  if (!ownerAddress) {
    return res.status(STATUS_BAD_REQUEST).json({ error: true, message: "Missing wallet address" });
  }

  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(`https://public-api.birdeye.so/v1/wallet/token_list?wallet=${ownerAddress}`, {
      headers: {
        Accept: "application/json",
        "x-chain": "solana",
        "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const { success, data } = await response.json();

    if (!success || !data) {
      throw new Error("Invalid response from Birdeye API");
    }

    const tokens: Token[] = data.items
      .slice(0, 20)
      .map((item: any) => ({
        name: item.name,
        symbol: item.symbol,
        price: item.priceUsd,
        total: item.valueUsd,
      }))
      .sort((a: Token, b: Token) => b.total - a.total);

    const responseData: {
      totalValue: number;
      tokens?: Token[];
    } = {
      totalValue: data.totalUsd,
    };

    if (tokenList) {
      responseData.tokens = tokens;
    }

    // cache for 1 hour
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=59");
    return res.status(STATUS_OK).json(responseData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
