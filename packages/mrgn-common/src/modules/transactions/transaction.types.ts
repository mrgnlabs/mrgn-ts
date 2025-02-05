import { VersionedTransaction, Transaction, Signer, AddressLookupTableAccount } from "@solana/web3.js";

export type MRGN_TX_TYPES = "CRANK" | "SETUP" | "BUNDLE_TIP" | "MRGN_ACCOUNT_CREATION" | "ATAS" | "SWAP" | "SIGN";

export enum TransactionType {
  // BASE LENDING ACTIONS
  DEPOSIT = "DEPOSIT",
  WITHDRAW = "WITHDRAW",
  REPAY = "REPAY",
  BORROW = "BORROW",

  // FLASHLOANS
  FLASHLOAN = "FLASHLOAN",
  LOOP = "LOOP",
  REPAY_COLLAT = "REPAY_COLLAT",
  LONG = "LONG",
  SHORT = "SHORT",

  // SETUP
  CREATE_ACCOUNT = "CREATE_ACCOUNT",
  CREATE_ATA = "CREATE_ATA",

  // ACCOUNT MANAGEMENT
  CLOSE_ACCOUNT = "CLOSE_ACCOUNT",
  CLOSE_POSITION = "CLOSE_POSITION",
  MOVE_POSITION = "MOVE_POSITION",
  WITHDRAW_ALL = "WITHDRAW_ALL",
  TRANSFER_AUTH = "TRANSFER_AUTH",

  // SWB
  CRANK = "CRANK",

  // NATIVE STAKE ACTIONS
  DEPOSIT_STAKE = "DEPOSIT_STAKE",
  WITHDRAW_STAKE = "WITHDRAW_STAKE",
  INITIALIZE_STAKED_POOL = "INITIALIZE_STAKED_POOL",
  ADD_STAKED_BANK = "ADD_STAKED_BANK",

  // LST
  STAKE_TO_STAKE = "STAKE_TO_STAKE",
  MINT_LST_NATIVE = "MINT_LST_NATIVE",
  SWAP_TO_SOL = "SWAP_TO_SOL",
  SOL_TO_LST = "SOL_TO_LST",

  // EMISSIONS
  WITHDRAW_EMISSIONS = "WITHDRAW_EMISSIONS",

  // LIQUIDATE
  LIQUIDATE_ACCOUNT = "LIQUIDATE_ACCOUNT",

  // BANK and GROUPS
  CREATE_PERM_BANK = "CREATE_PERM_BANK",
  CREATE_GROUP = "CREATE_GROUP",
  JUPITER_SWAP = "JUPITER_SWAP",
}

interface TransactionConfig {
  label: string;
}

export const TransactionConfigMap: Record<TransactionType, TransactionConfig> = {
  [TransactionType.DEPOSIT]: {
    label: "Depositing",
  },
  [TransactionType.WITHDRAW]: {
    label: "Withdrawing",
  },
  [TransactionType.REPAY]: {
    label: "Repaying",
  },
  [TransactionType.BORROW]: {
    label: "Borrowing",
  },
  [TransactionType.LOOP]: {
    label: "Looping",
  },
  [TransactionType.REPAY_COLLAT]: {
    label: "Repaying Collateral",
  },
  [TransactionType.LONG]: {
    label: "Long Position",
  },
  [TransactionType.SHORT]: {
    label: "Short Position",
  },
  [TransactionType.CRANK]: {
    label: "Cranking",
  },
  [TransactionType.FLASHLOAN]: { label: "Flashloan" },
  [TransactionType.CREATE_ACCOUNT]: { label: "Create Account" },
  [TransactionType.CREATE_ATA]: { label: "Create ATA" },
  [TransactionType.CLOSE_ACCOUNT]: { label: "Close Account" },
  [TransactionType.CLOSE_POSITION]: { label: "Close Position" },
  [TransactionType.MOVE_POSITION]: { label: "Move Position" },
  [TransactionType.WITHDRAW_ALL]: { label: "Withdraw All" },
  [TransactionType.TRANSFER_AUTH]: { label: "Transfer Auth" },
  [TransactionType.DEPOSIT_STAKE]: { label: "Deposit Stake" },
  [TransactionType.WITHDRAW_STAKE]: { label: "Withdraw Stake" },
  [TransactionType.WITHDRAW_EMISSIONS]: { label: "Withdraw Emissions" },
  [TransactionType.LIQUIDATE_ACCOUNT]: { label: "Liquidate Account" },
  [TransactionType.STAKE_TO_STAKE]: { label: "Stake to Stake" },
  [TransactionType.MINT_LST_NATIVE]: { label: "Mint LST Native" },
  [TransactionType.CREATE_PERM_BANK]: { label: "Create Perm Bank" },
  [TransactionType.CREATE_GROUP]: { label: "Create Group" },
  [TransactionType.SWAP_TO_SOL]: { label: "Swap to SOL" },
  [TransactionType.SOL_TO_LST]: { label: "SOL to LST" },
  [TransactionType.JUPITER_SWAP]: { label: "Swapping tokens" },
  [TransactionType.INITIALIZE_STAKED_POOL]: { label: "Initializing Staked Pool" },
  [TransactionType.ADD_STAKED_BANK]: { label: "Adding Staked Bank" },
};

export enum TRANSACTIONS_TYPES {
  CRANK_SWB = 0,
}

export const MRGN_TX_TYPE_TOAST_MAP: Record<MRGN_TX_TYPES, string> = {
  CRANK: "Updating latest prices",
  SETUP: "Setting up token accounts",
  BUNDLE_TIP: "Sending bundle tip",
  MRGN_ACCOUNT_CREATION: "Creating marginfi account",
  ATAS: "Creating associated token account",
  SWAP: "Swapping tokens",
  SIGN: "Signing transaction",
};

export type ExtendedTransaction = Transaction & {
  type: TransactionType;
  signers?: Array<Signer>;
  addressLookupTables?: AddressLookupTableAccount[];
  unitsConsumed?: number;
};

export type ExtendedV0Transaction = VersionedTransaction & {
  type: TransactionType;
  signers?: Array<Signer>;
  addressLookupTables?: AddressLookupTableAccount[];
  unitsConsumed?: number;
};

export type SolanaTransaction = ExtendedTransaction | ExtendedV0Transaction;
