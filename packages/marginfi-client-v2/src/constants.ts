import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

export const PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED = Buffer.from("liquidity_vault_auth");
export const PDA_BANK_INSURANCE_VAULT_AUTH_SEED = Buffer.from("insurance_vault_auth");
export const PDA_BANK_FEE_VAULT_AUTH_SEED = Buffer.from("fee_vault_auth");

export const PDA_BANK_LIQUIDITY_VAULT_SEED = Buffer.from("liquidity_vault");
export const PDA_BANK_INSURANCE_VAULT_SEED = Buffer.from("insurance_vault");
export const PDA_BANK_FEE_VAULT_SEED = Buffer.from("fee_vault");

export const PYTH_PRICE_CONF_INTERVALS = new BigNumber(2.12);
export const SWB_PRICE_CONF_INTERVALS = new BigNumber(2.12);
export const USDC_DECIMALS = 6;

export const ADDRESS_LOOKUP_TABLE_FOR_GROUP: { [key: string]: [PublicKey] } = {
  "4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8": [new PublicKey("2FyGQ8UZ6PegCSN2Lu7QD1U2UY28GpJdDfdwEfbwxN7p")],
};

export const DISABLED_FLAG: number = 1 << 0;
export const FLASHLOAN_ENABLED_FLAG: number = 1 << 2;
export const TRANSFER_ACCOUNT_AUTHORITY_FLAG: number = 1 << 3;
