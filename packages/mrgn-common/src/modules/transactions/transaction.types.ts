import { VersionedTransaction, Transaction, Signer, AddressLookupTableAccount } from "@solana/web3.js";

export type SolanaTransaction = (VersionedTransaction | Transaction) & {
  signers?: Array<Signer>;
  addressLookupTables?: AddressLookupTableAccount[];
};
