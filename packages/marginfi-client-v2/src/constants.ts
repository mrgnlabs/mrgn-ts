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
    new PublicKey("BrWF8J3CEuHaXsWk3kqGZ6VHvRp4SJuG9AzvB6ei2kbV"),
    new PublicKey("8GLUprtyzv6HGrgox7F43EQM5GqE2uKrAHLs69r8DgRj"),
  ], // Main pool
  FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo: [new PublicKey("HxPy7b58KLKSU7w4LUW9xwYQ1NPyRNQkYYk2f7SmYAip")], // staging
};

export const DISABLED_FLAG: number = 1 << 0;
export const FLASHLOAN_ENABLED_FLAG: number = 1 << 2;
export const TRANSFER_ACCOUNT_AUTHORITY_FLAG: number = 1 << 3;

export const PYTH_PUSH_ORACLE_ID = new PublicKey("pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT");

export const DEFAULT_ORACLE_MAX_AGE = 60; // seconds
