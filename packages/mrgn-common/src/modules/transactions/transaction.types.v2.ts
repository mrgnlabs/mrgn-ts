import { VersionedTransaction, Transaction, Signer, AddressLookupTableAccount, PublicKey } from "@solana/web3.js";

export enum TransactionTypeV2 {
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
interface TransactionConfigV2 {
  label: (infoProps?: Record<string, any>) => string; // Always a function
  fallback?: string; // Only for dynamic messages
}

export const TransactionConfigMapV2: Record<TransactionTypeV2, TransactionConfigV2> = {
  // BASE LENDING ACTIONS
  [TransactionTypeV2.DEPOSIT]: {
    label: ({ amount, token } = {}) => (amount && token ? `Depositing ${amount} ${token}` : "Depositing"),
  },
  [TransactionTypeV2.WITHDRAW]: {
    label: ({ amount, token } = {}) => (amount && token ? `Withdrawing ${amount} ${token}` : "Withdrawing"),
  },
  [TransactionTypeV2.REPAY]: {
    label: ({ amount, token } = {}) => (amount && token ? `Repaying ${amount} ${token}` : "Repaying"),
  },
  [TransactionTypeV2.BORROW]: {
    label: ({ amount, token } = {}) => (amount && token ? `Borrowing ${amount} ${token}` : "Borrowing"),
  },

  // FLASHLOANS
  [TransactionTypeV2.FLASHLOAN]: { label: () => "Executing Flashloan" },
  [TransactionTypeV2.LOOP]: {
    label: ({ depositAmount, depositToken, borrowAmount, borrowToken } = {}) =>
      depositAmount && depositToken && borrowAmount && borrowToken
        ? `Looping ${depositAmount} ${depositToken} with ${borrowAmount} ${borrowToken}`
        : "Looping",
  },
  [TransactionTypeV2.REPAY_COLLAT]: {
    label: ({ borrowAmount, borrowToken, depositAmount, depositToken } = {}) =>
      borrowAmount && borrowToken && depositAmount && depositToken
        ? `Repaying ${borrowAmount} ${borrowToken} with ${depositAmount} ${depositToken}`
        : "Repaying with collateral",
  },
  [TransactionTypeV2.LONG]: {
    label: ({ depositToken, amount, borrowToken } = {}) =>
      depositToken && amount && borrowToken ? `Longing ${depositToken} with ${amount} ${borrowToken}` : "Opening Long position",
  },
  [TransactionTypeV2.SHORT]: {
    label: ({ borrowToken, amount, depositToken } = {}) =>
      borrowToken && amount && depositToken ? `Shorting ${borrowToken} with ${amount} ${depositToken}` : "Opening Short position",
  },

  // SWB
  [TransactionTypeV2.CRANK]: { label: () => "Updating latest prices" },
  [TransactionTypeV2.JUPITER_SWAP]: {
    label: ({ originAmount, originToken, destinationAmount, destinationToken } = {}) =>
      originAmount && originToken && destinationAmount && destinationToken
        ? `Swapping ${originAmount} ${originToken} for ${destinationAmount} ${destinationToken}`
        : "Swapping tokens",
  },

  // SETUP
  [TransactionTypeV2.CREATE_ACCOUNT]: { label: () => "Creating Account" },
  [TransactionTypeV2.CREATE_ATA]: { label: () => "Creating ATA" },

  // ACCOUNT MANAGEMENT
  [TransactionTypeV2.CLOSE_ACCOUNT]: { label: () => "Closing Account" },
  [TransactionTypeV2.CLOSE_POSITION]: { label: () => "Closing Position" },
  [TransactionTypeV2.MOVE_POSITION]: { label: () => "Moving Position" },
  [TransactionTypeV2.TRANSFER_AUTH]: { label: () => "Transferring Account Authorization" },

  // NATIVE STAKE ACTIONS
  [TransactionTypeV2.DEPOSIT_STAKE]: {
    label: ({ amount, token } = {}) => (amount && token ? `Staking and depositing ${amount} ${token}` : "Staking and depositing"),
  },
  [TransactionTypeV2.WITHDRAW_STAKE]: {
    label: ({ amount, token } = {}) => (amount && token ? `Unstaking and withdrawing ${amount} ${token}` : "Unstaking and withdrawing"),
  },
  [TransactionTypeV2.INITIALIZE_STAKED_POOL]: { label: () => "Initializing Staked Pool" },
  [TransactionTypeV2.ADD_STAKED_BANK]: { label: () => "Adding Staked Bank" },

  // LST (Liquid Staking Tokens)
  [TransactionTypeV2.STAKE_TO_STAKE]: { label: () => "Converting Staked Token" },
  [TransactionTypeV2.MINT_LST_NATIVE]: { label: () => "Minting Liquid Staked Native Token" },
  [TransactionTypeV2.SWAP_TO_SOL]: {
    label: ({ amount, token } = {}) => (amount && token ? `Swapping ${amount} ${token} to SOL` : "Swapping to SOL"),
  },
  [TransactionTypeV2.SOL_TO_LST]: {
    label: ({ amount, token } = {}) => (amount && token ? `Swapping ${amount} SOL to ${token}` : "Swapping to LST"),
  },

  // EMISSIONS
  [TransactionTypeV2.WITHDRAW_EMISSIONS]: { label: () => "Withdrawing Emissions" },

  // LIQUIDATE
  [TransactionTypeV2.LIQUIDATE_ACCOUNT]: { label: () => "Liquidating Account" },

  // BANK and GROUPS
  [TransactionTypeV2.CREATE_PERM_BANK]: { label: () => "Creating Permanent Bank" },
  [TransactionTypeV2.CREATE_GROUP]: { label: () => "Creating Group" },
  [TransactionTypeV2.WITHDRAW_ALL]: {
    label: ({ amount, token } = {}) => (amount && token ? `Withdrawing ${amount} ${token}` : "Withdrawing all"),
  },
};