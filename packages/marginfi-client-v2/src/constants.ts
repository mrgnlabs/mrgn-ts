import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

export const PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED = Buffer.from("liquidity_vault_auth");
export const PDA_BANK_INSURANCE_VAULT_AUTH_SEED = Buffer.from("insurance_vault_auth");
export const PDA_BANK_FEE_VAULT_AUTH_SEED = Buffer.from("fee_vault_auth");

export const PDA_BANK_LIQUIDITY_VAULT_SEED = Buffer.from("liquidity_vault");
export const PDA_BANK_INSURANCE_VAULT_SEED = Buffer.from("insurance_vault");
export const PDA_BANK_FEE_VAULT_SEED = Buffer.from("fee_vault");

export const PYTH_PRICE_CONF_INTERVALS = new BigNumber(2.12);
export const SWB_PRICE_CONF_INTERVALS = new BigNumber(1.96);
export const MAX_CONFIDENCE_INTERVAL_RATIO = new BigNumber(0.05);
export const USDC_DECIMALS = 6;

export const ADDRESS_LOOKUP_TABLE_FOR_GROUP: { [key: string]: PublicKey[] } = {
  "4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8": [
    // new PublicKey("2FyGQ8UZ6PegCSN2Lu7QD1U2UY28GpJdDfdwEfbwxN7p"),
    new PublicKey("HGmknUTUmeovMc9ryERNWG6UFZDFDVr9xrum3ZhyL4fC"),
    new PublicKey("5FuKF7C1tJji2mXZuJ14U9oDb37is5mmvYLf4KwojoF1"),
  ], // Main pool
  "FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo": [new PublicKey("HxPy7b58KLKSU7w4LUW9xwYQ1NPyRNQkYYk2f7SmYAip")], // staging
  EnQoeGVqbgZ78Hj8XghiYu5L29L1zYwZp2YEQ63RmUD8: [new PublicKey("86kn22MeV1bCqE9tT9ATcHYR1hYrQHUGigLgSvvDSGRL")], // MOTHER
  "6FDHo1Z3W1GvurvAZhDAuPpMYbUR3jgq9VuCBmFDx2wM": [new PublicKey("LCuK5xWuTbCp6vUnvTzTAbKKF5UnxU9ENy5rjHx7Ldw")], // BODEN
  CRBQpH41XWrUiBp6Bf5hjf7r7rspVZNVaCd6mGewFhLZ: [new PublicKey("2njqwPa2yoeRonwkNAXrzyabq4qaQsYbEKDkB1CGG8xf")], // QUAC
  HW6FTYrm8JZ4ayZzYUW3WVbzL2xLr7krFZP8VbN4Tq6N: [new PublicKey("4imCax5w4h5uxmwN9mTXytsSo3NFX7BzbiLB3LQrBYic")], // WEN
};

export const DISABLED_FLAG: number = 1 << 0;
export const FLASHLOAN_ENABLED_FLAG: number = 1 << 2;
export const TRANSFER_ACCOUNT_AUTHORITY_FLAG: number = 1 << 3;

export const PYTH_PUSH_ORACLE_ID = new PublicKey("pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT");

export const DEFAULT_ORACLE_MAX_AGE = 60; // seconds
