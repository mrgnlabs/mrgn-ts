import { VersionedTransaction, Transaction, Signer, AddressLookupTableAccount, PublicKey } from "@solana/web3.js";
// import {
//   MARGINFI_ACCOUNT_INITIALIZE_RENT_SIZES,
//   MARGINFI_ACCOUNT_DEPOSIT_RENT_SIZES,
//   MARGINFI_ACCOUNT_WITHDRAW_RENT_SIZES,
//   MARGINFI_ACCOUNT_REPAY_RENT_SIZES,
//   MARGINFI_ACCOUNT_BORROW_RENT_SIZES,
// } from "../../constants";

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
  UNSTAKE_LST = "UNSTAKE_LST",

  // EMISSIONS
  WITHDRAW_EMISSIONS = "WITHDRAW_EMISSIONS",

  // LIQUIDATE
  LIQUIDATE_ACCOUNT = "LIQUIDATE_ACCOUNT",

  // BANK and GROUPS
  CREATE_PERM_BANK = "CREATE_PERM_BANK",
  CREATE_GROUP = "CREATE_GROUP",
  JUPITER_SWAP = "JUPITER_SWAP",
}

// interface TransactionRent {
//   rents: number[];
// }

// export const TransactionRentMap: Record<TransactionType, TransactionRent> = {
//   [TransactionType.CREATE_ACCOUNT]: { rents: MARGINFI_ACCOUNT_INITIALIZE_RENT_SIZES },
//   [TransactionType.DEPOSIT]: {
//     rents: MARGINFI_ACCOUNT_DEPOSIT_RENT_SIZES,
//   },
//   [TransactionType.WITHDRAW]: {
//     rents: MARGINFI_ACCOUNT_WITHDRAW_RENT_SIZES,
//   },
//   [TransactionType.REPAY]: {
//     rents: MARGINFI_ACCOUNT_REPAY_RENT_SIZES,
//   },
//   [TransactionType.BORROW]: {
//     rents: MARGINFI_ACCOUNT_BORROW_RENT_SIZES,
//   },
//   [TransactionType.FLASHLOAN]: {
//     rents: [165],
//   },
//   [TransactionType.LOOP]: {
//     rents: [165],
//   },
//   [TransactionType.REPAY_COLLAT]: {
//     rents: [165],
//   },
//   [TransactionType.LONG]: {
//     rents: [165],
//   },
//   [TransactionType.SHORT]: {
//     rents: [165],
//   },
//   [TransactionType.CLOSE_POSITION]: {
//     rents: [165],
//   },
//   [TransactionType.MOVE_POSITION_WITHDRAW]: {
//     rents: [165],
//   },
//   [TransactionType.MOVE_POSITION_DEPOSIT]: {
//     rents: [165],
//   },
//   [TransactionType.WITHDRAW_ALL]: {
//     rents: [165],
//   },
//   [TransactionType.WITHDRAW_STAKE]: {
//     rents: [165],
//   },
//   [TransactionType.INITIALIZE_STAKED_POOL]: {
//     rents: [165],
//   },
//   [TransactionType.ADD_STAKED_BANK]: {
//     rents: [165],
//   },
//   [TransactionType.STAKE_TO_STAKE]: {
//     rents: [165],
//   },
//   [TransactionType.MINT_LST_NATIVE]: {
//     rents: [165],
//   },
//   [TransactionType.UNSTAKE_LST]: {
//     rents: [165],
//   },
//   [TransactionType.WITHDRAW_EMISSIONS]: {
//     rents: [165],
//   },
//   [TransactionType.LIQUIDATE_ACCOUNT]: {
//     rents: [165],
//   },
//   [TransactionType.CREATE_PERM_BANK]: {
//     rents: [165],
//   },
//   [TransactionType.JUPITER_SWAP]: { rents: [165] },
//   [TransactionType.CREATE_ATA]: { rents: [165] },
//   [TransactionType.CLOSE_ACCOUNT]: { rents: [165] },
//   [TransactionType.TRANSFER_AUTH]: { rents: [165] },
//   [TransactionType.CRANK]: { rents: [165] },
//   [TransactionType.DEPOSIT_STAKE]: { rents: [165] },
//   [TransactionType.SWAP_TO_SOL]: { rents: [165] },
//   [TransactionType.SOL_TO_LST]: { rents: [165] },
//   [TransactionType.CREATE_GROUP]: { rents: [165] },
// };

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
        ? `Long ${depositToken} with ${depositAmount} ${borrowToken}`
        : "Open long position",
  },
  [TransactionType.SHORT]: {
    label: ({ borrowToken, depositAmount, depositToken } = {}) =>
      borrowToken && depositAmount && depositToken
        ? `Short ${borrowToken} with ${depositAmount} ${depositToken}`
        : "Open short position",
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
  [TransactionType.UNSTAKE_LST]: { label: ({ amount } = {}) => (amount ? `Unstake ${amount} LST` : "Unstake LST") },
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
