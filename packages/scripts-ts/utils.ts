import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { bigNumberToWrappedI80F48 } from "@mrgnlabs/mrgn-common";
import { Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";

export const I80F48_ZERO = bigNumberToWrappedI80F48(0);
export const I80F48_ONE = bigNumberToWrappedI80F48(1);

/**
 * Load local wallet keypair at given path if you have a bs58 encoded keypair stored as an array
 * (typically how solana tools will output a keypair)
 * @param filePath
 * @returns
 */
export function loadKeypairFromFile(filePath: string): Keypair {
  const keyData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keyData));
}

export const DEFAULT_API_URL = "https://api.mainnet-beta.solana.com";
export function loadEnvFile(filePath: string) {
  try {
    const envData = fs.readFileSync(filePath, { encoding: "utf-8" });
    const lines = envData.split("\n");

    for (const line of lines) {
      // Skip empty lines or lines that don't contain `=`
      if (!line.includes("=") || line.trim().startsWith("#")) continue;

      // Split on the first `=` only
      const [key, ...rest] = line.split("=");
      const value = rest.join("="); // Rejoin the rest as the value
      if (key && value) {
        process.env[key.trim()] = value.trim(); // Add to process.env
      }
    }
  } catch (err) {
    console.error(`Failed to load .env file: ${filePath}`, err);
  }
}

/**
 * Load local wallet keypair at a given path if you have a secret key as plain text (typically how
 * wallets like Phantom will allow you to view the secret key)
 * @param filePath
 * @returns
 */
export function loadKeypairFromTxtFile(filePath: string): Keypair {
  const base58Key = fs.readFileSync(filePath, "utf-8").trim();
  const secretKeyArray = bs58.decode(base58Key);
  return Keypair.fromSecretKey(secretKeyArray);
}

export const SINGLE_POOL_PROGRAM_ID = new PublicKey("SVSPxpvHdN29nkVg9rPapPNDddN5DipNLRUFhyjFThE");
