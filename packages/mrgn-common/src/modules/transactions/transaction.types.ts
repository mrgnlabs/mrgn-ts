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
  MOVE_POSITION_WITHDRAW = "MOVE_POSITION_WITHDRAW",
  MOVE_POSITION_DEPOSIT = "MOVE_POSITION_DEPOSIT",
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
    label: ({ amount, token } = {}) => (amount && token ? `Deposit ${amount} ${token}` : "Deposit"),
  },
  [TransactionType.WITHDRAW]: {
    label: ({ amount, token } = {}) => (amount && token ? `Withdraw ${amount} ${token}` : "Withdraw"),
  },
  [TransactionType.REPAY]: {
    label: ({ amount, token } = {}) => (amount && token ? `Repay ${amount} ${token}` : "Repay"),
  },
  [TransactionType.BORROW]: {
    label: ({ amount, token } = {}) => (amount && token ? `Borrow ${amount} ${token}` : "Borrow"),
  },

  // FLASHLOANS
  [TransactionType.FLASHLOAN]: { label: () => "Executing Flashloan" },
  [TransactionType.LOOP]: {
    label: ({ depositAmount, depositToken, borrowAmount, borrowToken } = {}) =>
      depositAmount && depositToken && borrowAmount && borrowToken
        ? `Loop ${depositAmount} ${depositToken} with ${borrowAmount} ${borrowToken}`
        : "Loop",
  },
  [TransactionType.REPAY_COLLAT]: {
    label: ({ repayAmount, repayToken, amount, token } = {}) =>
      repayAmount && repayToken && amount && token
        ? `Repay ${repayAmount} ${token} with   ${amount} ${repayToken}`
        : "Repay with collateral",
  },
  [TransactionType.LONG]: {
    label: ({ depositToken, depositAmount, borrowToken } = {}) =>
      depositToken && depositAmount && borrowToken
        ? `Longing ${depositToken} with ${depositAmount} ${borrowToken}`
        : "Opening Long position",
  },
  [TransactionType.SHORT]: {
    label: ({ borrowToken, depositAmount, depositToken } = {}) =>
      borrowToken && depositAmount && depositToken
        ? `Shorting ${borrowToken} with ${depositAmount} ${depositToken}`
        : "Opening Short position",
  },

  // SWB
  [TransactionType.CRANK]: { label: () => "Updating latest prices" },
  [TransactionType.JUPITER_SWAP]: {
    label: ({ originAmount, originToken, destinationAmount, destinationToken } = {}) =>
      originAmount && originToken && destinationAmount && destinationToken
        ? `Swap ${originAmount} ${originToken} for ${destinationAmount} ${destinationToken}`
        : "Swap tokens",
  },

  // SETUP
  [TransactionType.CREATE_ACCOUNT]: { label: () => "Create marginfi account" },
  [TransactionType.CREATE_ATA]: { label: () => "Configure token account" },

  // ACCOUNT MANAGEMENT
  [TransactionType.CLOSE_ACCOUNT]: { label: () => "Close marginfi account" },
  [TransactionType.CLOSE_POSITION]: { label: () => "Close position" },
  [TransactionType.MOVE_POSITION_WITHDRAW]: {
    label: ({ originAccountAddress } = {}) => `Move position from ${originAccountAddress}`,
  },
  [TransactionType.MOVE_POSITION_DEPOSIT]: {
    label: ({ destinationAccountAddress } = {}) => `Move position to ${destinationAccountAddress}`,
  },
  [TransactionType.TRANSFER_AUTH]: { label: () => "Authorize account transfer" },

  // NATIVE STAKE ACTIONS
  [TransactionType.DEPOSIT_STAKE]: {
    label: ({ amount, token } = {}) =>
      amount && token ? `Authorize stake account and deposit ${amount} ${token}` : "Authorize stake and deposit",
  },
  [TransactionType.WITHDRAW_STAKE]: {
    label: ({ amount, token } = {}) => "Authorize stake account",
  },
  [TransactionType.INITIALIZE_STAKED_POOL]: { label: () => "Initialize stake pool" },
  [TransactionType.ADD_STAKED_BANK]: { label: () => "Create staked asset bank" },

  // LST (Liquid Staking Tokens)
  [TransactionType.STAKE_TO_STAKE]: { label: () => "Convert stake" },
  [TransactionType.MINT_LST_NATIVE]: { label: () => "Mint LST" },
  [TransactionType.SWAP_TO_SOL]: {
    label: ({ swapAmount, token } = {}) => (swapAmount && token ? `Swap ${swapAmount} ${token} to SOL` : "Swap to SOL"),
  },
  [TransactionType.SOL_TO_LST]: {
    label: ({ amount } = {}) => (amount ? `Mint LST with ${amount} SOL` : "Mint LST with SOL"),
  },

  // EMISSIONS
  [TransactionType.WITHDRAW_EMISSIONS]: { label: () => "Withdraw emissions" },

  // LIQUIDATE
  [TransactionType.LIQUIDATE_ACCOUNT]: { label: () => "Liquidate account" },

  // BANK and GROUPS
  [TransactionType.CREATE_PERM_BANK]: { label: () => "Create permissionless bank" },
  [TransactionType.CREATE_GROUP]: { label: () => "Create marginfi group" },
  [TransactionType.WITHDRAW_ALL]: {
    label: ({ amount, token } = {}) => (amount && token ? `Withdraw ${amount} ${token}` : "Withdraw all"),
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

export type ExtendedTransaction = Transaction & ExtendedTransactionProperties;

export type ExtendedV0Transaction = VersionedTransaction & ExtendedTransactionProperties;

export type SolanaTransaction = ExtendedTransaction | ExtendedV0Transaction;
