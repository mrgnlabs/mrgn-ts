import { NextApiRequest, NextApiResponse } from "next";

import { TokenVolumeData } from "~/types";
import { PoolListApiResponse } from "~/types/api.types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let host = extractHost(req.headers.origin) || extractHost(req.headers.referer);

  if (!host) {
    return res.status(400).json({ error: "Invalid input: expected a valid host." });
  }

  const poolList: PoolListApiResponse[] = await fetch(`${host}/api/pool/list`).then((response) => response.json());

  const tokenMints = poolList.map((pool) => pool.base_bank.mint.address);
  const quoteMints = poolList.map((pool) => pool.quote_bank.mint.address);

  const allTokens = [...new Set([...tokenMints, ...quoteMints])];

  const batchSize = 50;
  const tokens = Array.from({ length: Math.ceil(allTokens.length / batchSize) }, (_, i) =>
    allTokens.slice(i * batchSize, (i + 1) * batchSize)
  );

  // Fetch token volume
  let tokenVolumePromisses: Promise<Response>[] = [];

  tokens.forEach((tokenBatch) => {
    const addresses = tokenBatch.join(",");

    const bodyData = {
      list_address: addresses,
      //   type: "24h",
    };

    tokenVolumePromisses.push(
      fetch(`https://public-api.birdeye.so/defi/price_volume/multi`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-chain": "solana",
          "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
        },
        body: JSON.stringify(bodyData),
      })
    );
  });

  // Fetch from API and update cache
  try {
    const volumeResponses = await Promise.all(tokenVolumePromisses);

    if (!volumeResponses.every((response) => response.ok)) {
      throw new Error("Network response was not ok");
    }

    const volumeDataRaw: TokenVolumeDataRawResponse[] = await Promise.all(
      volumeResponses.map((response) => response.json())
    );

    if (!volumeDataRaw) {
      res.status(404).json({ error: "Token data not found" });
      return;
    }

    const volumeData = {
      data: volumeDataRaw.reduce(
        (acc, curr) => ({
          ...acc,
          ...curr.data,
        }),
        {}
      ),
    }.data as TokenVolumeDataResponse;

    const volumeDataList = Object.values(volumeData);

    const tokenDatas: TokenVolumeData[] = volumeDataList.map((volume, index) => {
      return {
        mint: allTokens[index],
        price: volume.price,
        priceChange24h: volume.priceChangePercent,
        volume24h: volume.volumeUSD,
        volumeChange24h: volume.volumeChangePercent,
        volume4h: 0,
        volumeChange4h: 0,
        marketcap: 0,
      };
    });

    // 5 min cache
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=59");
    res.status(200).json(tokenDatas);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
}

type TokenVolumeDataResponse = {
  [address: string]: {
    price: number;
    updateUnixTime: number;
    updateHumanTime: string;
    volumeUSD: number;
    volumeChangePercent: number;
    priceChangePercent: number;
  };
};

type TokenVolumeDataRawResponse = {
  data: TokenVolumeData;
};

function extractHost(referer: string | undefined): string | undefined {
  if (!referer) {
    return undefined;
  }
  const url = new URL(referer);
  return url.origin;
}
