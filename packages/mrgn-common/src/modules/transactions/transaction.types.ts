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
  label: (infoProps?: Record<string, any>) => string; // Always a function
  fallback?: string; // Only for dynamic messages
}

export const TransactionConfigMap: Record<TransactionType, TransactionConfig> = {
  // BASE LENDING ACTIONS
  [TransactionType.DEPOSIT]: {
    label: ({ amount, token } = {}) => (amount && token ? `Depositing ${amount} ${token}` : "Depositing"),
  },
  [TransactionType.WITHDRAW]: {
    label: ({ amount, token } = {}) => (amount && token ? `Withdrawing ${amount} ${token}` : "Withdrawing"),
  },
  [TransactionType.REPAY]: {
    label: ({ amount, token } = {}) => (amount && token ? `Repaying ${amount} ${token}` : "Repaying"),
  },
  [TransactionType.BORROW]: {
    label: ({ amount, token } = {}) => (amount && token ? `Borrowing ${amount} ${token}` : "Borrowing"),
  },

  // FLASHLOANS
  [TransactionType.FLASHLOAN]: { label: () => "Executing Flashloan" },
  [TransactionType.LOOP]: {
    label: ({ depositAmount, depositToken, borrowAmount, borrowToken } = {}) =>
      depositAmount && depositToken && borrowAmount && borrowToken
        ? `Looping ${depositAmount} ${depositToken} with ${borrowAmount} ${borrowToken}`
        : "Looping",
  },
  [TransactionType.REPAY_COLLAT]: {
    label: ({ borrowAmount, borrowToken, depositAmount, depositToken } = {}) =>
      borrowAmount && borrowToken && depositAmount && depositToken
        ? `Repaying ${borrowAmount} ${borrowToken} with ${depositAmount} ${depositToken}`
        : "Repaying with collateral",
  },
  [TransactionType.LONG]: {
    label: ({ depositToken, amount, borrowToken } = {}) =>
      depositToken && amount && borrowToken ? `Longing ${depositToken} with ${amount} ${borrowToken}` : "Opening Long position",
  },
  [TransactionType.SHORT]: {
    label: ({ borrowToken, amount, depositToken } = {}) =>
      borrowToken && amount && depositToken ? `Shorting ${borrowToken} with ${amount} ${depositToken}` : "Opening Short position",
  },

  // SWB
  [TransactionType.CRANK]: { label: () => "Updating latest prices" },
  [TransactionType.JUPITER_SWAP]: {
    label: ({ originAmount, originToken, destinationAmount, destinationToken } = {}) =>
      originAmount && originToken && destinationAmount && destinationToken
        ? `Swapping ${originAmount} ${originToken} for ${destinationAmount} ${destinationToken}`
        : "Swapping tokens",
  },

  // SETUP
  [TransactionType.CREATE_ACCOUNT]: { label: () => "Creating Account" },
  [TransactionType.CREATE_ATA]: { label: () => "Creating ATA" },

  // ACCOUNT MANAGEMENT
  [TransactionType.CLOSE_ACCOUNT]: { label: () => "Closing Account" },
  [TransactionType.CLOSE_POSITION]: { label: () => "Closing Position" },
  [TransactionType.MOVE_POSITION]: { label: () => "Moving Position" },
  [TransactionType.TRANSFER_AUTH]: { label: () => "Transferring Account Authorization" },

  // NATIVE STAKE ACTIONS
  [TransactionType.DEPOSIT_STAKE]: {
    label: ({ amount, token } = {}) => (amount && token ? `Staking and depositing ${amount} ${token}` : "Staking and depositing"),
  },
  [TransactionType.WITHDRAW_STAKE]: {
    label: ({ amount, token } = {}) => (amount && token ? `Unstaking and withdrawing ${amount} ${token}` : "Unstaking and withdrawing"),
  },
  [TransactionType.INITIALIZE_STAKED_POOL]: { label: () => "Initializing Staked Pool" },
  [TransactionType.ADD_STAKED_BANK]: { label: () => "Adding Staked Bank" },

  // LST (Liquid Staking Tokens)
  [TransactionType.STAKE_TO_STAKE]: { label: () => "Converting Staked Token" },
  [TransactionType.MINT_LST_NATIVE]: { label: () => "Minting Liquid Staked Native Token" },
  [TransactionType.SWAP_TO_SOL]: {
    label: ({ amount, token } = {}) => (amount && token ? `Swapping ${amount} ${token} to SOL` : "Swapping to SOL"),
  },
  [TransactionType.SOL_TO_LST]: {
    label: ({ amount, token } = {}) => (amount && token ? `Swapping ${amount} SOL to ${token}` : "Swapping to LST"),
  },

  // EMISSIONS
  [TransactionType.WITHDRAW_EMISSIONS]: { label: () => "Withdrawing Emissions" },

  // LIQUIDATE
  [TransactionType.LIQUIDATE_ACCOUNT]: { label: () => "Liquidating Account" },

  // BANK and GROUPS
  [TransactionType.CREATE_PERM_BANK]: { label: () => "Creating Permanent Bank" },
  [TransactionType.CREATE_GROUP]: { label: () => "Creating Group" },
  [TransactionType.WITHDRAW_ALL]: {
    label: ({ amount, token } = {}) => (amount && token ? `Withdrawing ${amount} ${token}` : "Withdrawing all"),
  },
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
