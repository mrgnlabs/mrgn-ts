import { BankMetadata, loadBankMetadatas } from "@mrgnlabs/mrgn-common";
import { NextApiRequest, NextApiResponse } from "next";
import { BANK_METADATA_MAP } from "~/config/trade";

import type { TokenData } from "~/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let bankMetadataCache: {
    [address: string]: BankMetadata;
  } = {};

  try {
    bankMetadataCache = await loadBankMetadatas(BANK_METADATA_MAP);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching bank metadata" });
    return;
  }

  const allTokens = [...new Set(Object.values(bankMetadataCache).map((bank) => bank.tokenAddress))];

  const batchSize = 50;
  const tokens = Array.from({ length: Math.ceil(allTokens.length / batchSize) }, (_, i) =>
    allTokens.slice(i * batchSize, (i + 1) * batchSize)
  );

  // Fetch token volume
  let tokenVolumePromisses: Promise<Response>[] = [];
  let tokenMetadataPromisses: Promise<Response>[] = [];

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

    //A list of addresses in string separated by commas (,)

    tokenMetadataPromisses.push(
      fetch(`https://public-api.birdeye.so/defi/v3/token/meta-data/multiple?list_address=${addresses}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-chain": "solana",
          "X-Api-Key": process.env.BIRDEYE_API_KEY || "",
        },
      })
    );
  });

  // Fetch from API and update cache
  try {
    const volumeResponses = await Promise.all(tokenVolumePromisses);
    const metadataResponses = await Promise.all(tokenMetadataPromisses);

    if (!volumeResponses.every((response) => response.ok) || !metadataResponses.every((response) => response.ok)) {
      throw new Error("Network response was not ok");
    }

    const volumeDataRaw = (await Promise.all(
      volumeResponses.map((response) => response.json())
    )) as TokenVolumeDataRaw[];
    const metadataDataRaw = (await Promise.all(
      metadataResponses.map((response) => response.json())
    )) as TokenMetaDataRaw[];

    if (!volumeDataRaw || !metadataDataRaw) {
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
    }.data as TokenVolumeData;

    const metadataData = {
      data: metadataDataRaw.reduce(
        (acc, curr) => ({
          ...acc,
          ...curr.data,
        }),
        {}
      ),
    }.data as TokenMetaData;

    const metadataDataList = Object.values(metadataData);

    const tokenDatas: TokenData[] = metadataDataList.map((data) => {
      const volume = volumeData[data.address];

      return {
        address: data.address,
        name: data.name,
        symbol: data.symbol,
        imageUrl: data.logo_uri,
        decimals: data.decimals,
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

type TokenVolumeData = {
  [address: string]: {
    price: number;
    updateUnixTime: number;
    updateHumanTime: string;
    volumeUSD: number;
    volumeChangePercent: number;
    priceChangePercent: number;
  };
};

type TokenVolumeDataRaw = {
  data: TokenVolumeData;
};

type TokenMetaData = {
  [address: string]: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    extensions: {
      coingecko_id: string;
      website: string;
      twitter: string;
      discord: string;
      medium: string;
    };
    logo_uri: string;
  };
};

type TokenMetaDataRaw = {
  data: TokenMetaData;
};
