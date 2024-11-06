import { VersionedTransaction, Transaction, Signer, AddressLookupTableAccount } from "@solana/web3.js";

export type ExtendedTransaction = Transaction & {
  signers?: Array<Signer>;
  addressLookupTables?: AddressLookupTableAccount[];
};

export type ExtendedV0Transaction = VersionedTransaction & {
  signers?: Array<Signer>;
  addressLookupTables?: AddressLookupTableAccount[];
};

export type SolanaTransaction = ExtendedTransaction | ExtendedV0Transaction;
