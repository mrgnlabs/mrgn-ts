import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

// wallet adapter context type to override with web3auth data

// this allows us to pass web3auth wallet to 3rd party services that expect wallet adapter
export type WalletContextOverride = {
  connecting: boolean;
  connected: boolean;
  icon: string;
  connect: () => void;
  disconnect: () => void;
  select: () => void;
  publicKey: PublicKey | undefined;
  signTransaction: <T extends Transaction | VersionedTransaction>(transactions: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
};

// wallet adapter context has a nested wallet object
export type WalletContextStateOverride = {
  wallet: {
    adapter: WalletContextOverride;
  };
} & WalletContextOverride;
