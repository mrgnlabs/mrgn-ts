import { NextApiRequest, NextApiResponse } from "next";
import { IntegrationsData } from "~/components/common/Stake/utils/stake-utils";

type AssetInfo = {
  address: string;
  decimals: number;
  icon: string;
  symbol: string;
};

type MarketInfo = {
  address: string;
  base: AssetInfo;
  createdAt: string;
  liquidity: number;
  name: string;
  price: number;
  quote: AssetInfo;
  source: string;
  trade24h: number;
  trade24hChangePercent: number;
  uniqueWallet24h: number;
  uniqueWallet24hChangePercent: number;
  volume24h: number;
};

const BIRDEYE_API = "https://public-api.birdeye.so";

function getMarketUrl(source: string, address: string, token: string) {
  switch (source) {
    case "Orca":
      return `https://v1.orca.so/liquidity/browse?tokenMint=${token}`;
    case "Raydium Clamm":
      return `https://raydium.io/clmm/create-position/?pool_id=${address}`;
    case "Meteora":
      return `https://app.meteora.ag/pools/${address}`;
    case "Meteora Dlmm":
      return `https://app.meteora.ag/dlmm/${address}`;
    default:
      return "";
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;
  if (!token) {
    res.status(400).json({ error: "No token provided" });
    return;
  }

  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  // Fetch from API and update cache
  try {
    const response = await fetch(`${BIRDEYE_API}/defi/v2/markets?address=${token}&sort_by=liquidity&sort_type=desc`, {
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
    const data = await response.json();
    const items = data.data.items || [];
    const supportedMarkets = ["Orca", "Raydium Clamm", "Meteora"];
    const markets: IntegrationsData[] = items
      .filter((market: MarketInfo) => supportedMarkets.includes(market.source))
      .slice(0, 5)
      .map((market: MarketInfo) => ({
        title: market.name,
        poolInfo: {
          dex: market.source,
          poolId: market.address,
        },
        info: {
          tvl: market.liquidity,
          vol: market.volume24h,
        },
        link: getMarketUrl(market.source, market.address, market.base.address),
        base: {
          address: market.base.address,
          symbol: market.base.symbol,
        },
        quote: {
          address: market.quote.address,
          symbol: market.quote.symbol,
        },
      }));

    // cache for 4 minutes
    res.setHeader("Cache-Control", "s-maxage=240, stale-while-revalidate=59");
    res.status(200).json(markets);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}
