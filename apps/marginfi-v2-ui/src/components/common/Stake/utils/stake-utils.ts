export interface IntegrationsData {
  title: string;
  poolInfo: {
    dex: string;
    poolId: string;
  };
  info?: {
    tvl: number;
    vol: number;
  };
  link: string;
  base: {
    address: string;
    symbol: string;
  };
  quote: {
    address: string;
    symbol: string;
  };
}

export interface LSTOverview {
  volume: number;
  volumeUsd: number;
  tvl: number;
}

export async function fetchLSTOverview(mint: string): Promise<LSTOverview> {
  const response = await fetch(`/api/birdeye/overview?token=${mint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const responseBody = await response.json();
  if (responseBody.success) {
    const volume = responseBody.data.v24h;
    const volumeUsd = responseBody.data.v24hUSD;
    const tvl = responseBody.data.liquidity;
    return {
      volume,
      volumeUsd,
      tvl,
    };
  }

  throw new Error("Failed to fetch token overview");
}
