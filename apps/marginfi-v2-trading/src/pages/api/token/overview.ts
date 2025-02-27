import { NextApiRequest, NextApiResponse } from "next";
import { TokenData } from "~/types";

function cdnImageUrl(url: string) {
  return `https://img.fotofolio.xyz/?url=${encodeURIComponent(url)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  if (!address) {
    res.status(400).json({ error: "No token provided" });
    return;
  }

  // Fetch from API and update cache
  try {
    const response = await fetch(`https://public-api.birdeye.so/defi/token_overview?address=${address}`, {
      headers: {
        Accept: "application/json",
        "x-chain": "solana",
        "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const { data } = (await response.json()) as ApiResponse;

    if (!data) {
      res.status(404).json({ error: "Token data not found" });
      return;
    }

    const tokenData: TokenData = {
      address: data.address,
      name: data.name,
      symbol: data.symbol,
      imageUrl: data.logoURI,
      decimals: data.decimals,
      price: data.price,
      priceChange24h: data.priceChange24hPercent,
      volume24h: data.v24hUSD,
      volumeChange24h: data.v24hChangePercent,
      volume4h: data.v4hUSD,
      volumeChange4h: data.v4hChangePercent,
      marketcap: data.realMc,
    };

    // 5 min cache
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=59");
    res.status(200).json(tokenData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}

type ExtensionsResponse = {
  coingeckoId: string;
  serumV3Usdc: string;
  serumV3Usdt: string;
  website: string;
  telegram: string | null;
  twitter: string;
  description: string;
  discord: string;
  medium: string;
};

type TokenDataResponse = {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  marketCap: number;
  fdv: number;
  extensions: ExtensionsResponse;
  logoURI: string;
  liquidity: number;
  lastTradeUnixTime: number;
  lastTradeHumanTime: string;
  price: number;
  history30mPrice: number;
  priceChange30mPercent: number;
  history1hPrice: number;
  priceChange1hPercent: number;
  history2hPrice: number;
  priceChange2hPercent: number;
  history4hPrice: number;
  priceChange4hPercent: number;
  history6hPrice: number;
  priceChange6hPercent: number;
  history8hPrice: number;
  priceChange8hPercent: number;
  history12hPrice: number;
  priceChange12hPercent: number;
  history24hPrice: number;
  priceChange24hPercent: number;
  uniqueWallet30m: number;
  uniqueWalletHistory30m: number;
  uniqueWallet30mChangePercent: number;
  uniqueWallet1h: number;
  uniqueWalletHistory1h: number;
  uniqueWallet1hChangePercent: number;
  uniqueWallet2h: number;
  uniqueWalletHistory2h: number;
  uniqueWallet2hChangePercent: number;
  uniqueWallet4h: number;
  uniqueWalletHistory4h: number;
  uniqueWallet4hChangePercent: number;
  uniqueWallet8h: number;
  uniqueWalletHistory8h: number;
  uniqueWallet8hChangePercent: number;
  uniqueWallet24h: number;
  uniqueWalletHistory24h: number;
  uniqueWallet24hChangePercent: number;
  supply: number;
  totalSupply: number;
  mc: number;
  circulatingSupply: number;
  realMc: number;
  holder: number;
  trade30m: number;
  tradeHistory30m: number;
  trade30mChangePercent: number;
  sell30m: number;
  sellHistory30m: number;
  sell30mChangePercent: number;
  buy30m: number;
  buyHistory30m: number;
  buy30mChangePercent: number;
  v30m: number;
  v30mUSD: number;
  vHistory30m: number;
  vHistory30mUSD: number;
  v30mChangePercent: number;
  vBuy30m: number;
  vBuy30mUSD: number;
  vBuyHistory30m: number;
  vBuyHistory30mUSD: number;
  vBuy30mChangePercent: number;
  vSell30m: number;
  vSell30mUSD: number;
  vSellHistory30m: number;
  vSellHistory30mUSD: number;
  vSell30mChangePercent: number;
  trade1h: number;
  tradeHistory1h: number;
  trade1hChangePercent: number;
  sell1h: number;
  sellHistory1h: number;
  sell1hChangePercent: number;
  buy1h: number;
  buyHistory1h: number;
  buy1hChangePercent: number;
  v1h: number;
  v1hUSD: number;
  vHistory1h: number;
  vHistory1hUSD: number;
  v1hChangePercent: number;
  vBuy1h: number;
  vBuy1hUSD: number;
  vBuyHistory1h: number;
  vBuyHistory1hUSD: number;
  vBuy1hChangePercent: number;
  vSell1h: number;
  vSell1hUSD: number;
  vSellHistory1h: number;
  vSellHistory1hUSD: number;
  vSell1hChangePercent: number;
  trade2h: number;
  tradeHistory2h: number;
  trade2hChangePercent: number;
  sell2h: number;
  sellHistory2h: number;
  sell2hChangePercent: number;
  buy2h: number;
  buyHistory2h: number;
  buy2hChangePercent: number;
  v2h: number;
  v2hUSD: number;
  vHistory2h: number;
  vHistory2hUSD: number;
  v2hChangePercent: number;
  vBuy2h: number;
  vBuy2hUSD: number;
  vBuyHistory2h: number;
  vBuyHistory2hUSD: number;
  vBuy2hChangePercent: number;
  vSell2h: number;
  vSell2hUSD: number;
  vSellHistory2h: number;
  vSellHistory2hUSD: number;
  vSell2hChangePercent: number;
  trade4h: number;
  tradeHistory4h: number;
  trade4hChangePercent: number;
  sell4h: number;
  sellHistory4h: number;
  sell4hChangePercent: number;
  buy4h: number;
  buyHistory4h: number;
  buy4hChangePercent: number;
  v4h: number;
  v4hUSD: number;
  vHistory4h: number;
  vHistory4hUSD: number;
  v4hChangePercent: number;
  vBuy4h: number;
  vBuy4hUSD: number;
  vBuyHistory4h: number;
  vBuyHistory4hUSD: number;
  vBuy4hChangePercent: number;
  vSell4h: number;
  vSell4hUSD: number;
  vSellHistory4h: number;
  vSellHistory4hUSD: number;
  vSell4hChangePercent: number;
  trade8h: number;
  tradeHistory8h: number;
  trade8hChangePercent: number;
  sell8h: number;
  sellHistory8h: number;
  sell8hChangePercent: number;
  buy8h: number;
  buyHistory8h: number;
  buy8hChangePercent: number;
  v8h: number;
  v8hUSD: number;
  vHistory8h: number;
  vHistory8hUSD: number;
  v8hChangePercent: number;
  vBuy8h: number;
  vBuy8hUSD: number;
  vBuyHistory8h: number;
  vBuyHistory8hUSD: number;
  vBuy8hChangePercent: number;
  vSell8h: number;
  vSell8hUSD: number;
  vSellHistory8h: number;
  vSellHistory8hUSD: number;
  vSell8hChangePercent: number;
  trade24h: number;
  tradeHistory24h: number;
  trade24hChangePercent: number;
  sell24h: number;
  sellHistory24h: number;
  sell24hChangePercent: number;
  buy24h: number;
  buyHistory24h: number;
  buy24hChangePercent: number;
  v24h: number;
  v24hUSD: number;
  vHistory24h: number;
  vHistory24hUSD: number;
  v24hChangePercent: number;
  vBuy24h: number;
  vBuy24hUSD: number;
  vBuyHistory24h: number;
  vBuyHistory24hUSD: number;
  vBuy24hChangePercent: number;
  vSell24h: number;
  vSell24hUSD: number;
  vSellHistory24h: number;
  vSellHistory24hUSD: number;
  vSell24hChangePercent: number;
  numberMarkets: number;
};

type ApiResponse = {
  data: TokenDataResponse;
  success: boolean;
};
