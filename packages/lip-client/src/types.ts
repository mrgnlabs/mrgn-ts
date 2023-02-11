import { AnchorProvider, Program } from "@project-serum/anchor";
import { SignerWalletAdapter } from "@solana/wallet-adapter-base";
import { ConfirmOptions, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { Lip } from "./idl";

export type LipProgram = Omit<Program<Lip>, "provider"> & {
  provider: AnchorProvider;
};

export type Amount = BigNumber | number | string;

export type Wallet = Pick<SignerWalletAdapter, "signAllTransactions" | "signTransaction"> & {
  publicKey: PublicKey;
};

export interface TransactionOptions extends ConfirmOptions {
  dryRun?: boolean;
}

/**
 * Supported config environments.
 */
export type Environment = "production" | "alpha" | "staging" | "dev";

export interface InstructionsWrapper {
  instructions: TransactionInstruction[];
  keys: Keypair[];
}

export interface LipConfig {
  environment: Environment;
  cluster: string;
  programId: PublicKey;
}
