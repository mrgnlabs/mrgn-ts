import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { bigNumberToWrappedI80F48 } from "@mrgnlabs/mrgn-common";
import { Keypair } from "@solana/web3.js";
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
