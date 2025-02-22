import * as fs from "fs";
import path from "path";
import dotenv from "dotenv";
import BigNumber from "bignumber.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import { groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { AccountCache } from "./types";

dotenv.config();

export function loadKeypairFromFile(filePath: string): Keypair {
  const keyData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keyData));
}

export function formatNumber(num: number | BigNumber): string {
  const value = typeof num === "number" ? new BigNumber(num) : num;
  if (value.eq(0)) return "0";
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
