import { PublicKey } from "@solana/web3.js";
import {
  BankRawDto,
  dtoToBankRaw,
  fetchMultipleBanks,
  fetchOracleData,
  OraclePrice,
  PythPushFeedIdMap,
} from "@mrgnlabs/marginfi-client-v2";
import { getConfig } from "../config/app.config";
import { BankRaw, AssetTag } from "@mrgnlabs/marginfi-client-v2";
import { BankMetadata } from "@mrgnlabs/mrgn-common";
import { Address } from "@coral-xyz/anchor";
import BigNumber from "bignumber.js";
import {
  BankChartData,
  BankChartDataDailyAverages,
  ExtendedBankInfo,
  RawMintData,
  StakePoolMetadata,
  TokenPriceMap,
  LstRatesMap,
} from "../types";
import { fillDataGaps, filterDailyRates } from "../lib";

export interface BankRawDatas {
  address: PublicKey;
  data: BankRaw;
}

export const fetchRawBanks = async (addresses: Address[]): Promise<BankRawDatas[]> => {
  const chunks: Address[][] = [];
  for (let i = 0; i < addresses.length; i += 60) {
    chunks.push(addresses.slice(i, i + 60));
  }

  // Fetch all chunks in parallel
  const responses = await Promise.all(
    chunks.map((chunk) =>
      fetch(`/api/bankData/rawBankData?addresses=${chunk.map((addr) => addr.toString()).join(",")}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
    )
  );

  const banks = (await Promise.all(responses.map((response) => response.json())))
    .map((responseData: { address: string; data: BankRawDto }[]) => Object.values(responseData))
    .flat()
    .map((d) => {
      return {
        address: new PublicKey(d.address),
        data: dtoToBankRaw(d.data),
      };
    });

  return banks;
};

export const fetchMintData = async (addresses: Address[]): Promise<RawMintData[]> => {
  // Split addresses into chunks of 60
  const chunks: Address[][] = [];
  for (let i = 0; i < addresses.length; i += 60) {
    chunks.push(addresses.slice(i, i + 60));
  }

  // Fetch all chunks in parallel
  const responses = await Promise.all(
    chunks.map((chunk) =>
      fetch(`/api/bankData/mintData?mints=${chunk.map((addr) => addr.toString()).join(",")}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
    )
  );

  const mintDatas = (await Promise.all(responses.map((response) => response.json())))
    .map((responseData: Record<string, { tokenProgram: string; decimals: number; mint: string }>) =>
      Object.values(responseData)
    )
    .flat()
    .map((d) => {
      return {
        mint: new PublicKey(d.mint),
        decimals: d.decimals,
        tokenProgram: new PublicKey(d.tokenProgram),
      };
    });

  return mintDatas;
};

export const fetchOraclePrices = async (
  banks: BankRawDatas[],
  bankMetadataMap: { [address: string]: BankMetadata }
): Promise<{ oracleMap: Map<string, OraclePrice>; pythFeedIdMap: PythPushFeedIdMap }> => {
  const connection = getConfig().connection;

  const oracleData = await fetchOracleData(banks, bankMetadataMap, connection, { useApiEndpoint: true });
  return { oracleMap: oracleData.bankOraclePriceMap, pythFeedIdMap: oracleData.pythFeedMap };
};

// Static Switchboard oracle feeds that should use Birdeye prices
const STATIC_SWITCHBOARD_FEEDS = [
  "Ct5RHK1ZBJni58mTai45k5ucSRhYY1h6gesWpQPwbRSY", // zero price
  "9U47fk7i47aZkJq6LEGu8mjnQevWvgDZJjjXuhwYfJWu", // 1e-6 price
  "DMhGWtLAKE5d56WdyHQxqeFncwUeqMEnuC2RvvZfbuur", // 1e-8 price
];

/**
 * Fetches Birdeye prices for specific mint addresses using the existing /api/tokens/multi endpoint.
 *
 * @param mintAddresses - Array of mint addresses to fetch prices for
 * @returns Promise resolving to a record mapping mint addresses to their price values
 *
 * @internal This function is used internally for static Switchboard feed price replacement
 */
async function fetchBirdeyePricesForMints(mintAddresses: string[]): Promise<Record<string, number>> {
  if (mintAddresses.length === 0) {
    return {};
  }

  try {
    const url = `/api/tokens/multi?mintList=${mintAddresses.join(",")}`;
    const response = await fetch(url);

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    const rawPrices = data.data || {};

    const extractedPrices: Record<string, number> = {};
    Object.entries(rawPrices).forEach(([mint, priceData]: [string, any]) => {
      if (priceData && typeof priceData === "object" && "value" in priceData) {
        extractedPrices[mint] = priceData.value;
      }
    });

    return extractedPrices;
  } catch (error) {
    console.warn("Error fetching Birdeye prices for static feeds:", error);
    return {};
  }
}

/**
 * Fetches oracle prices with automatic Birdeye price fallback for static Switchboard feeds.
 *
 * This function provides a backward-compatible solution for handling static
 * Switchboard oracle feeds that return incorrect prices (zero, 1e-6, or 1e-8). When such
 * feeds are detected, their prices are automatically replaced with live Birdeye prices.
 *
 * @param banks - Array of bank raw data containing oracle configuration
 * @param bankMetadataMap - Map of bank metadata indexed by bank address
 * @returns Promise resolving to oracle data with enhanced prices for static feeds
 *  */
export async function fetchOraclePricesWithBirdeyeFallback(
  banks: BankRawDatas[],
  bankMetadataMap: { [address: string]: BankMetadata }
): Promise<{ oracleMap: Map<string, OraclePrice>; pythFeedIdMap: PythPushFeedIdMap }> {
  const oracleData = await fetchOraclePrices(banks, bankMetadataMap);

  const banksNeedingFallback = banks.filter((bank) => {
    const bankAddress = bank.address.toBase58();
    const oracleKey = bank.data.config.oracleKeys[0]?.toBase58();
    const oraclePrice = oracleData.oracleMap.get(bankAddress);

    const isStaticFeed = oracleKey && STATIC_SWITCHBOARD_FEEDS.includes(oracleKey);
    const isMissingPrice = !oraclePrice;
    const isZeroPrice =
      oraclePrice && (oraclePrice.priceRealtime.price.isZero() || oraclePrice.priceWeighted.price.isZero());

    return isStaticFeed || isMissingPrice || isZeroPrice;
  });

  if (banksNeedingFallback.length === 0) {
    return oracleData;
  }

  const fallbackMints = banksNeedingFallback.map((bank) => bank.data.mint.toBase58());
  const birdeyePrices = await fetchBirdeyePricesForMints(fallbackMints);

  const enhancedOracleMap = new Map(oracleData.oracleMap);

  banksNeedingFallback.forEach((bank) => {
    const mintAddress = bank.data.mint.toBase58();
    const bankAddress = bank.address.toBase58();
    const birdeyePrice = birdeyePrices[mintAddress];

    if (birdeyePrice && birdeyePrice > 0) {
      const oldPrice = enhancedOracleMap.get(bankAddress);

      const price = BigNumber(birdeyePrice);
      const newOraclePrice = {
        priceRealtime: {
          price,
          confidence: oldPrice?.priceRealtime?.confidence || BigNumber(0),
          lowestPrice: price,
          highestPrice: price,
        },
        priceWeighted: {
          price,
          confidence: oldPrice?.priceWeighted?.confidence || BigNumber(0),
          lowestPrice: price,
          highestPrice: price,
        },
        timestamp: oldPrice?.timestamp || BigNumber(Date.now()),
      };

      enhancedOracleMap.set(bankAddress, newOraclePrice);
    }
  });

  return {
    oracleMap: enhancedOracleMap,
    pythFeedIdMap: oracleData.pythFeedIdMap,
  };
}

export const fetchEmissionPriceMap = async (banks: BankRawDatas[]): Promise<TokenPriceMap> => {
  const banksWithEmissions = banks.filter((bank) => !bank.data.emissionsMint.equals(PublicKey.default));
  const emissionsMints = banksWithEmissions.map((bank) => bank.data.emissionsMint);

  const chunks: PublicKey[][] = [];
  for (let i = 0; i < emissionsMints.length; i += 60) {
    chunks.push(emissionsMints.slice(i, i + 60));
  }

  // Fetch all chunks in parallel
  const responses = await Promise.all(
    chunks.map((chunk) =>
      fetch("/api/bankData/emissionData?mintList=" + chunk.map((addr) => addr.toBase58()).join(","), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
    )
  );

  const rawEmissionPrices = (await Promise.all(responses.map((response) => response.json()))).reduce(
    (acc, chunk) => {
      // Each chunk is a Record<string, { mint: string; price: number; decimals: number }>
      return { ...acc, ...chunk };
    },
    {} as Record<string, { mint: string; price: number; decimals: number; tokenProgram: string }>
  );

  // Transform the raw data into a TokenPriceMap
  const tokenPriceMap: TokenPriceMap = {};

  Object.entries(rawEmissionPrices).forEach(([mint, rawData]) => {
    // Type assertion to help TypeScript recognize the structure
    const data = rawData as { mint: string; price: number; decimals: number; tokenProgram: PublicKey };
    tokenPriceMap[mint] = {
      price: new BigNumber(data.price),
      decimals: data.decimals,
      tokenProgram: new PublicKey(data.tokenProgram),
    };
  });

  return tokenPriceMap;
};

export const fetchBankRates = async (
  bankAddress: string,
  bank?: ExtendedBankInfo,
  stakepoolMetadataMap?: Map<string, StakePoolMetadata>
): Promise<BankChartDataDailyAverages[]> => {
  const response = await fetch(`/api/banks/historic?address=${bankAddress}`);
  if (!response.ok) {
    throw new Error(`Error fetching bank rates: ${response.statusText}`);
  }

  const result: BankChartData[] = await response.json();

  const processedData = result.map((item) => {
    const price = bank?.info.oraclePrice.priceRealtime.price.toNumber() || 0;
    const isStaked = bank?.info.rawBank.config.assetTag === AssetTag.STAKED;
    const stakepoolMetadata = stakepoolMetadataMap?.get(bankAddress);

    return {
      ...item,
      ...(isStaked && { borrowRate: 0, depositRate: stakepoolMetadata?.validatorRewards }),
      totalBorrowsUsd: item.totalBorrows * price,
      totalDepositsUsd: item.totalDeposits * price,
    };
  });

  const dailyRates = filterDailyRates(processedData);
  const filledData = fillDataGaps(dailyRates, 30);

  return filledData;
};

export const fetchLstRates = async (bankAddress?: string): Promise<LstRatesMap> => {
  const url = bankAddress ? `/api/banks/lst-rates?address=${bankAddress}` : `/api/banks/lst-rates`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching LST rates: ${response.statusText}`);
  }

  const result = await response.json();

  // Always return a map, even if it's just one entry
  const ratesArray = Array.isArray(result) ? result : [result];
  const ratesMap = new Map<string, number>();

  ratesArray.forEach((item: { mint: string; lst_apy: number }) => {
    if (item?.mint && typeof item.lst_apy === "number") {
      ratesMap.set(item.mint, item.lst_apy);
    }
  });

  return ratesMap;
};
