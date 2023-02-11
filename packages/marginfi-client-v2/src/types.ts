import { PublicKey } from "@solana/web3.js";
import { Marginfi } from "./idl/marginfi-types";
import { Program } from "@mrgnlabs/mrgn-common";

export type MarginfiProgram = Program<Marginfi>;

/**
 * Supported config environments.
 */
export type Environment = "production" | "alpha" | "staging" | "dev";

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
  banks: BankAddress[];
}

export interface BankAddress {
  label: string;
  address: PublicKey;
}

// --- On-chain account structs

export enum AccountType {
  MarginfiGroup = "marginfiGroup",
  MarginfiAccount = "marginfiAccount",
}
