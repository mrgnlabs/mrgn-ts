import { PublicKey } from "@solana/web3.js";
import {
  BankRawDto,
  dtoToBankRaw,
  fetchOracleData,
  OraclePrice,
  PythPushFeedIdMap,
} from "@mrgnlabs/marginfi-client-v2";
import { getConfig } from "../config/app.config";
import { BankRaw } from "@mrgnlabs/marginfi-client-v2";
import { BankMetadata } from "@mrgnlabs/mrgn-common";
import { Address } from "@coral-xyz/anchor";
import BigNumber from "bignumber.js";
import {
  RawMintData,
  StakePoolMetadata,
  TokenPriceMap,
  LstRatesMap,
  rawHistoricBankData,
  historicBankChartData,
  ExtendedBankInfo,
} from "../types";
import { convertRawHistoricBankDataToChartData } from "../lib";

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
 */
export async function fetchOraclePricesWithBirdeyeFallback(
  banks: BankRawDatas[],
  bankMetadataMap: { [address: string]: BankMetadata }
): Promise<{
  oracleMap: Map<string, OraclePrice>;
  oracleMapByMint: Map<string, OraclePrice>;
  pythFeedIdMap: PythPushFeedIdMap;
}> {
  // Pre-identify static feeds before fetching oracle data
  const staticFeedBanks: BankRawDatas[] = [];
  const nonStaticBanks: BankRawDatas[] = [];

  banks.forEach((bank) => {
    const oracleKey = bank.data.config.oracleKeys[0]?.toBase58();
    const isStaticFeed = oracleKey && STATIC_SWITCHBOARD_FEEDS.includes(oracleKey);

    if (isStaticFeed) {
      staticFeedBanks.push(bank);
    } else {
      nonStaticBanks.push(bank);
    }
  });

  // Fetch oracle data only for non-static feeds
  const connection = getConfig().connection;
  const oracleData = await fetchOracleData(nonStaticBanks, bankMetadataMap, connection, { useApiEndpoint: true });

  // Identify failed feeds from the non-static banks that were fetched
  const failedFeedBanks: BankRawDatas[] = [];

  nonStaticBanks.forEach((bank) => {
    const bankAddress = bank.address.toBase58();
    const oraclePrice = oracleData.bankOraclePriceMap.get(bankAddress);

    const isMissingPrice = !oraclePrice;
    const isZeroPrice =
      oraclePrice && (oraclePrice.priceRealtime.price.isZero() || oraclePrice.priceWeighted.price.isZero());

    if (isMissingPrice || isZeroPrice) {
      failedFeedBanks.push(bank);
    }
  });

  const banksNeedingFallback = [...staticFeedBanks, ...failedFeedBanks];

  if (banksNeedingFallback.length === 0) {
    // Create mint-based oracle map for convenience
    const mintOracleMap = new Map<string, OraclePrice>();
    banks.forEach((bank) => {
      const bankAddress = bank.address.toBase58();
      const mintAddress = bank.data.mint.toBase58();
      const oraclePrice = oracleData.bankOraclePriceMap.get(bankAddress);
      if (oraclePrice) {
        mintOracleMap.set(mintAddress, oraclePrice);
      }
    });

    return {
      oracleMap: oracleData.bankOraclePriceMap,
      oracleMapByMint: mintOracleMap,
      pythFeedIdMap: oracleData.pythFeedMap,
    };
  }

  const fallbackMints = banksNeedingFallback.map((bank) => bank.data.mint.toBase58());
  const birdeyePrices = await fetchBirdeyePricesForMints(fallbackMints);

  const enhancedOracleMap = new Map(oracleData.bankOraclePriceMap);

  // Create enhanced mint-based oracle map
  const enhancedMintOracleMap = new Map<string, OraclePrice>();
  banks.forEach((bank) => {
    const bankAddress = bank.address.toBase58();
    const mintAddress = bank.data.mint.toBase58();
    const oraclePrice = enhancedOracleMap.get(bankAddress);
    if (oraclePrice) {
      enhancedMintOracleMap.set(mintAddress, oraclePrice);
    }
  });

  banksNeedingFallback.forEach((bank) => {
    const mintAddress = bank.data.mint.toBase58();
    const bankAddress = bank.address.toBase58();
    const birdeyePrice = birdeyePrices[mintAddress];

    if (birdeyePrice && birdeyePrice > 0) {
      const oldPrice = enhancedOracleMap.get(bankAddress);

      const price = new BigNumber(birdeyePrice);
      const newOraclePrice = {
        priceRealtime: {
          price,
          confidence: oldPrice?.priceRealtime?.confidence || new BigNumber(0),
          lowestPrice: price,
          highestPrice: price,
        },
        priceWeighted: {
          price,
          confidence: oldPrice?.priceWeighted?.confidence || new BigNumber(0),
          lowestPrice: price,
          highestPrice: price,
        },
        timestamp: oldPrice?.timestamp || new BigNumber(Date.now()),
      };

      enhancedOracleMap.set(bankAddress, newOraclePrice);
      enhancedMintOracleMap.set(mintAddress, newOraclePrice);
    }
  });

  // Log static feeds (expected behavior)
  if (staticFeedBanks.length > 0) {
    console.log(
      `[Oracle Fallback] Used Birdeye prices for static feeds (always switchboard): ${staticFeedBanks.map((bank) => bank.address.toBase58()).join(", ")}`
    );
  }

  // Warn about failed feeds (unexpected behavior)
  if (failedFeedBanks.length > 0) {
    const failedFeedDetails = failedFeedBanks.map((bank) => {
      const oracleSetup = bank.data.config.oracleSetup;
      const oracleKey = Object.keys(oracleSetup)[0].toLowerCase();
      let oracleType = "Unknown";

      // Check if it's a Pyth oracle
      if (oracleKey === "pythlegacy" || oracleKey === "pythpushoracle" || oracleKey === "stakedwithpythpush") {
        oracleType = "Pyth";
      }

      // Check if it's a Switchboard oracle
      if (oracleKey === "switchboardv2" || oracleKey === "switchboardpull") {
        oracleType = "Switchboard";
      }

      return `${bank.address.toBase58()} (${oracleType})`;
    });

    console.warn(`[Oracle Fallback] Used Birdeye prices for failed oracle feeds: ${failedFeedDetails.join(", ")}`);
  }

  return {
    oracleMap: enhancedOracleMap,
    oracleMapByMint: enhancedMintOracleMap,
    pythFeedIdMap: oracleData.pythFeedMap,
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
): Promise<historicBankChartData[]> => {
  const response = await fetch(`/api/banks/historic?address=${bankAddress}`);
  if (!response.ok) {
    throw new Error(`Error fetching bank rates: ${response.statusText}`);
  }

  const rawBankData: rawHistoricBankData[] = await response.json();

  const historicBankDataMap = convertRawHistoricBankDataToChartData(rawBankData, bank, stakepoolMetadataMap);

  return historicBankDataMap;
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

export const fetchEmissionsRates = async (): Promise<{
  [key: string]: {
    annualized_rate_enhancement: number;
  };
}> => {
  const response = await fetch("/api/emissions/rates", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching emissions rates: ${response.statusText}`);
  }

  return response.json();
};
