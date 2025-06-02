import * as fs from "fs";
import path from "path";
import dotenv from "dotenv";
import BigNumber from "bignumber.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import { groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { AccountCache, BankMetadata, BirdeyeTokenMetadataResponse, BirdeyePriceResponse } from "./types";
import { PYTH_PUSH_ORACLE_ID, PYTH_SPONSORED_SHARD_ID, MARGINFI_SPONSORED_SHARD_ID } from "./constants";
import { Environment } from "@mrgnlabs/marginfi-client-v2";

dotenv.config();

export function loadKeypairFromFile(filePath: string): Keypair {
  const keyData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keyData));
}

export function formatNumber(num: number | BigNumber): string {
  const value = typeof num === "number" ? new BigNumber(num) : num;
  if (value.eq(0)) return "0";
  if (value.lt(1)) return value.toFixed(4);
  return groupedNumberFormatterDyn.format(value.toNumber());
}

export function getCachedAccounts(): PublicKey[] {
  const CACHE_FILE = path.join(__dirname, "../account-cache.json");

  if (!fs.existsSync(CACHE_FILE)) {
    throw new Error("Account cache not found. Please run 'pnpm accounts:cache' first.");
  }

  const cache: AccountCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  const accounts = cache.accounts.map((addr) => new PublicKey(addr));
  return accounts.sort(() => Math.random() - 0.5);
}

export function getCachedActivity(): Record<string, any[]> {
  const CACHE_FILE = path.join(__dirname, "../activity-cache.json");

  if (!fs.existsSync(CACHE_FILE)) {
    throw new Error("Activity cache not found. Please run 'pnpm activity:cache' first.");
  }

  return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
}

function u16ToArrayBufferLE(value: number): Uint8Array {
  // Create a buffer of 2 bytes
  const buffer = new ArrayBuffer(2);
  const dataView = new DataView(buffer);

  // Set the Uint16 value in little-endian order
  dataView.setUint16(0, value, true);

  // Return the buffer
  return new Uint8Array(buffer);
}

function findPythPushOracleAddress(feedId: Buffer, programId: PublicKey, shardId: number): PublicKey {
  const shardBytes = u16ToArrayBufferLE(shardId);
  return PublicKey.findProgramAddressSync([shardBytes, feedId], programId)[0];
}

export function getPythPushOracleAddresses(feedId: Buffer): PublicKey[] {
  return [
    findPythPushOracleAddress(feedId, PYTH_PUSH_ORACLE_ID, PYTH_SPONSORED_SHARD_ID),
    findPythPushOracleAddress(feedId, PYTH_PUSH_ORACLE_ID, MARGINFI_SPONSORED_SHARD_ID),
  ];
}

export async function getBankMetadata(env: Environment): Promise<BankMetadata[]> {
  let bankMetadataUrl = "https://storage.googleapis.com/mrgn-public/mrgn-bank-metadata-cache.json";
  let stakedBankMetadataUrl = "https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache.json";

  if (env === "staging") {
    bankMetadataUrl = "https://storage.googleapis.com/mrgn-public/mrgn-bank-metadata-cache-stage.json";
    stakedBankMetadataUrl = "https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache-stage.json";
  }

  const bankMetadataResponse = await fetch(bankMetadataUrl);
  const stakedBankMetadataResponse = await fetch(stakedBankMetadataUrl);
  const bankMetadata = (await bankMetadataResponse.json()) as BankMetadata[];
  const stakedBankMetadata = (await stakedBankMetadataResponse.json()) as BankMetadata[];

  return [...bankMetadata, ...stakedBankMetadata];
}

export async function getBankMetadataFromBirdeye(bank: PublicKey, mint: PublicKey) {
  const birdeyeApiResponse = await fetch(
    `https://public-api.birdeye.so/defi/v3/token/meta-data/single?address=${mint.toBase58()}`,
    {
      headers: {
        "x-api-key": process.env.BIRDEYE_API_KEY,
        "x-chain": "solana",
      },
    }
  );
  const birdeyeApiJson: BirdeyeTokenMetadataResponse = await birdeyeApiResponse.json();

  if (birdeyeApiResponse.ok && birdeyeApiJson.data) {
    return {
      bankAddress: bank.toString(),
      tokenSymbol: birdeyeApiJson.data.symbol,
    };
  }

  return null;
}

/**
 * Fetches token prices for a list of banks using Birdeye API
 * @param banks Array of bank objects containing mint property
 * @returns A map of token addresses to their prices
 */
export async function getBankPrices(banks: any[]): Promise<Map<string, number>> {
  // Extract token addresses from banks
  const tokenAddresses = banks.map((bank) => bank.mint.toBase58());

  // Prepare request payload for Birdeye API
  const payload = {
    list_address: tokenAddresses.join(","),
  };

  // Make API request to Birdeye
  const birdeyeApiResponse = await fetch("https://public-api.birdeye.so/defi/multi_price", {
    method: "POST",
    headers: {
      "x-api-key": process.env.BIRDEYE_API_KEY,
      "x-chain": "solana",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // Parse response
  const birdeyeApiJson: BirdeyePriceResponse = await birdeyeApiResponse.json();
  const priceMap = new Map<string, number>();

  // Create a map of token address to price
  if (birdeyeApiResponse.ok && birdeyeApiJson.data) {
    Object.entries(birdeyeApiJson.data).forEach(([tokenAddress, priceData]) => {
      if (!priceData) return;
      priceMap.set(tokenAddress, priceData.value);
    });
  }

  return priceMap;
}
