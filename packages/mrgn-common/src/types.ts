import { AnchorProvider, BN, Program as AnchorProgram } from "@coral-xyz/anchor";
import { SignerWalletAdapter } from "@solana/wallet-adapter-base";
import { ConfirmOptions, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { Idl } from "@coral-xyz/anchor";

export type Program<T extends Idl> = Omit<AnchorProgram<T>, "provider"> & {
  provider: AnchorProvider;
};
export type ProgramReadonly<T extends Idl> = AnchorProgram<T>;

export type Amount = BigNumber | number | string;

export type Wallet = Pick<SignerWalletAdapter, "signAllTransactions" | "signTransaction"> & {
  publicKey: PublicKey;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
};

export interface TransactionOptions extends ConfirmOptions {
  dryRun?: boolean;
}

export interface InstructionsWrapper {
  instructions: TransactionInstruction[];
  keys: Keypair[];
}

export interface WrappedI80F48 {
  value: BN;
}
