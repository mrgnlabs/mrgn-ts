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
