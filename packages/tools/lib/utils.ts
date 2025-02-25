import * as fs from "fs";
import path from "path";
import dotenv from "dotenv";
import BigNumber from "bignumber.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import { groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { AccountCache } from "./types";
import { PYTH_PUSH_ORACLE_ID, PYTH_SPONSORED_SHARD_ID, MARGINFI_SPONSORED_SHARD_ID } from "./constants";

dotenv.config();

export function loadKeypairFromFile(filePath: string): Keypair {
  const keyData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keyData));
}

export function formatNumber(num: number | BigNumber): string {
  const value = typeof num === "number" ? new BigNumber(num) : num;
  if (value.eq(0)) return "0";
  if (value.lt(1)) return value.toString();
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

export async function getBankMetadata(): Promise<BankMetadata[]> {
  const bankMetadataResponse = await fetch("https://storage.googleapis.com/mrgn-public/mrgn-bank-metadata-cache.json");
  const stakedBankMetadataResponse = await fetch(
    "https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache.json"
  );
  const bankMetadata = (await bankMetadataResponse.json()) as BankMetadata[];
  const stakedBankMetadata = (await stakedBankMetadataResponse.json()) as BankMetadata[];

  return [...bankMetadata, ...stakedBankMetadata];
}

export type BankMetadata = {
  bankAddress: string;
  tokenSymbol: string;
};
