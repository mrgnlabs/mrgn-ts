import { VersionedTransaction, Transaction, Signer, AddressLookupTableAccount } from "@solana/web3.js";

export type MRGN_TX_TYPES = "CRANK" | "SETUP" | "BUNDLE_TIP" | "MRGN_ACCOUNT_CREATION";

export const MRGN_TX_TYPE_TOAST_MAP: Record<MRGN_TX_TYPES, string> = {
  CRANK: "Updating latest prices",
  SETUP: "Setting up token accounts",
  BUNDLE_TIP: "Sending bundle tip",
  MRGN_ACCOUNT_CREATION: "Creating marginfi account",
};

export type ExtendedTransaction = Transaction & {
  signers?: Array<Signer>;
  addressLookupTables?: AddressLookupTableAccount[];
  type?: MRGN_TX_TYPES;
  unitsConsumed?: number;
};

export type ExtendedV0Transaction = VersionedTransaction & {
  signers?: Array<Signer>;
  addressLookupTables?: AddressLookupTableAccount[];
  type?: MRGN_TX_TYPES;
  unitsConsumed?: number;
};

export type SolanaTransaction = ExtendedTransaction | ExtendedV0Transaction;
