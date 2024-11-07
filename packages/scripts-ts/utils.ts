import { bigNumberToWrappedI80F48 } from "@mrgnlabs/mrgn-common";
import { Keypair } from "@solana/web3.js";
import * as fs from "fs";

export const I80F48_ZERO = bigNumberToWrappedI80F48(0);
export const I80F48_ONE = bigNumberToWrappedI80F48(1);

/**
 * Load local wallet keypair at given path
 * @param filePath 
 * @returns 
 */
export function loadKeypairFromFile(filePath: string): Keypair {
    const keyData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return Keypair.fromSecretKey(new Uint8Array(keyData));
  }