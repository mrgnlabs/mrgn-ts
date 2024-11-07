import { PublicKey } from "@solana/web3.js";

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
  apy: number;
}

export const LST_MINT = new PublicKey("LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp");

export async function fetchLSTOverview(): Promise<LSTOverview> {
  const response = await fetch("/api/lst");

  const data: LSTOverview = {
    volume: 0,
    volumeUsd: 0,
    tvl: 0,
    apy: 0,
  };

  if (!response.ok) {
    return data;
  }

  const responseBody = await response.json();

  if (responseBody.error) {
    return data;
  }

  return responseBody.data;
}
