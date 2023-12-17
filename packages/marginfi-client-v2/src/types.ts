import { PublicKey } from "@solana/web3.js";
import { Marginfi } from "./idl/marginfi-types";
import { Program } from "@mrgnlabs/mrgn-common";

export type MarginfiProgram = Program<Marginfi>;

/**
 * Supported config environments.
 */
export type Environment = "production" | "alpha" | "staging" | "dev" | "mainnet-test-1" | "dev.1";

/**
 * Marginfi bank vault type
 */
export enum BankVaultType {
  LiquidityVault,
  InsuranceVault,
  FeeVault,
}

export interface MarginfiConfig {
  environment: Environment;
  cluster: string;
  programId: PublicKey;
  groupPk: PublicKey;
}

export interface BankAddress {
  label: string;
  address: PublicKey;
}

// --- On-chain account structs

export enum AccountType {
  MarginfiGroup = "marginfiGroup",
  MarginfiAccount = "marginfiAccount",
  Bank = "bank",
}
