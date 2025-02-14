import { VersionedTransaction, Transaction, Signer, AddressLookupTableAccount, PublicKey } from "@solana/web3.js";

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
    label: "Depositing AMOUNT TOKEN",
  },
  [TransactionType.WITHDRAW]: {
    label: "Withdrawing AMOUNT TOKEN",
  },
  [TransactionType.REPAY]: {
    label: "Repaying AMOUNT TOKEN",
  },
  [TransactionType.BORROW]: {
    label: "Borrowing AMOUNT TOKEN",
  },
  [TransactionType.LOOP]: {
    label: "Looping DEPOSIT AMOUNT DEPOSIT TOKEN with BORROW AMOUNT BORROW TOKEN",
  },
  [TransactionType.REPAY_COLLAT]: {
    label: "Repaying BORROW AMOUNT BORROW TOKEN with DEPOSIT AMOUNT DEPOSIT TOKEN",
  },
  [TransactionType.LONG]: {
    label: "Longing DEPOSIT TOKEN with AMOUNT BORROW TOKEN",
  },
  [TransactionType.SHORT]: {
    label: "Shorting BORROW TOKEN with AMOUNT DEPOSIT TOKEN",
  },
  [TransactionType.CRANK]: {
    label: "Updating latest prices",
  },
  [TransactionType.FLASHLOAN]: { label: "Flashloan" },
  [TransactionType.CREATE_ACCOUNT]: { label: "Creating Account" },
  [TransactionType.CREATE_ATA]: { label: "Creating ATA" },
  [TransactionType.CLOSE_ACCOUNT]: { label: "Closing Account" },
  [TransactionType.CLOSE_POSITION]: { label: "Closing Position" },
  [TransactionType.MOVE_POSITION]: { label: "Moving Position" },
  [TransactionType.WITHDRAW_ALL]: { label: "Withdrawing AMOUNT TOKEN" },
  [TransactionType.TRANSFER_AUTH]: { label: "Transfer Auth" },
  [TransactionType.DEPOSIT_STAKE]: { label: "Staking and depositing AMOUNT TOKEN" },
  [TransactionType.WITHDRAW_STAKE]: { label: "Unstaking and withdrawing AMOUNT TOKEN" },
  [TransactionType.WITHDRAW_EMISSIONS]: { label: "Withdrawing Emissions" },
  [TransactionType.LIQUIDATE_ACCOUNT]: { label: "Liquidate Account" },
  [TransactionType.STAKE_TO_STAKE]: { label: "Stake to Stake" },
  [TransactionType.MINT_LST_NATIVE]: { label: "Mint LST Native" },
  [TransactionType.CREATE_PERM_BANK]: { label: "Create Perm Bank" },
  [TransactionType.CREATE_GROUP]: { label: "Create Group" },
  [TransactionType.SWAP_TO_SOL]: { label: "Swapping AMOUNT TOKEN to SOL" },
  [TransactionType.SOL_TO_LST]: { label: "Swapping AMOUNT TOKEN to LST" },
  [TransactionType.JUPITER_SWAP]: { label: "Swapping ORIGIN AMOUNT ORIGIN TOKEN for DESTINATION AMOUNT DESTINATION TOKEN" },
  [TransactionType.INITIALIZE_STAKED_POOL]: { label: "Initializing Staked Pool" },
  [TransactionType.ADD_STAKED_BANK]: { label: "Adding Staked Bank" },
};

export const TransactionArenaKeyMap: Partial<Record<TransactionType, PublicKey>> = {
  [TransactionType.DEPOSIT]: new PublicKey("ArenaDeposit1111111111111111111111111111111"),
  [TransactionType.WITHDRAW]: new PublicKey("ArenaWithdraw111111111111111111111111111111"),
  [TransactionType.BORROW]: new PublicKey("ArenaBorrow11111111111111111111111111111111"),
  [TransactionType.REPAY]: new PublicKey("ArenaRepay111111111111111111111111111111111"),
  [TransactionType.REPAY_COLLAT]: new PublicKey("ArenaRepayCo11at111111111111111111111111111"),
  [TransactionType.LONG]: new PublicKey("ArenaLong1111111111111111111111111111111111"),
  [TransactionType.SHORT]: new PublicKey("ArenaShort111111111111111111111111111111111"),
  [TransactionType.CLOSE_POSITION]: new PublicKey("ArenaC1ose111111111111111111111111111111111"),
  // Add more mappings if needed
};

export type ExtendedTransactionProperties = {
  type: TransactionType;
  signers?: Array<Signer>;
  addressLookupTables?: AddressLookupTableAccount[];
  unitsConsumed?: number;
};

export type ExtendedTransaction = Transaction & ExtendedTransactionProperties

export type ExtendedV0Transaction = VersionedTransaction & ExtendedTransactionProperties

export type SolanaTransaction = ExtendedTransaction | ExtendedV0Transaction;
