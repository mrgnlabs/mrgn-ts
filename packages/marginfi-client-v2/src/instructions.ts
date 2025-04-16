import { AccountMeta, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import BN from "bn.js";
import { MarginfiProgram } from "./types";
import { BankConfigCompactRaw, BankConfigOptRaw } from "./services";
import { TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";

async function makeInitMarginfiAccountIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiGroup: PublicKey;
    marginfiAccount: PublicKey;
    authority: PublicKey;
    feePayer: PublicKey;
  }
) {
  return mfProgram.methods.marginfiAccountInitialize().accounts(accounts).instruction();
}

async function makeDepositIx(
  mfProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    marginfiAccount: PublicKey;
    signerTokenAccount: PublicKey;
    bank: PublicKey;
    tokenProgram: PublicKey;
    // Optional accounts - to override inference
    group?: PublicKey;
    authority?: PublicKey;
    liquidityVault?: PublicKey;
  },
  args: {
    amount: BN;
    depositUpToLimit?: boolean;
  },
  remainingAccounts: AccountMeta[] = []
) {
  const { marginfiAccount, signerTokenAccount, bank, tokenProgram, ...optionalAccounts } = accounts;

  return mfProgram.methods
    .lendingAccountDeposit(args.amount, args.depositUpToLimit ?? null)
    .accounts({
      marginfiAccount,
      signerTokenAccount,
      bank,
      tokenProgram,
    })
    .accountsPartial(optionalAccounts)
    .remainingAccounts(remainingAccounts)
    .instruction();
}

async function makeRepayIx(
  mfProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    marginfiAccount: PublicKey;
    signerTokenAccount: PublicKey;
    bank: PublicKey;
    tokenProgram: PublicKey;
    // Optional accounts - to override inference
    group?: PublicKey;
    authority?: PublicKey;
    liquidityVault?: PublicKey;
  },
  args: {
    amount: BN;
    repayAll?: boolean;
  },
  remainingAccounts: AccountMeta[] = []
) {
  const { marginfiAccount, signerTokenAccount, bank, tokenProgram, ...optionalAccounts } = accounts;

  return mfProgram.methods
    .lendingAccountRepay(args.amount, args.repayAll ?? null)
    .accounts({
      marginfiAccount,
      signerTokenAccount,
      bank,
      tokenProgram,
    })
    .accountsPartial(optionalAccounts)
    .remainingAccounts(remainingAccounts)
    .instruction();
}

async function makeWithdrawIx(
  mfProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    marginfiAccount: PublicKey;
    bank: PublicKey;
    destinationTokenAccount: PublicKey;
    tokenProgram: PublicKey;
    // Optional accounts - to override inference
    group?: PublicKey;
    authority?: PublicKey;
  },
  args: {
    amount: BN;
    withdrawAll?: boolean;
  },
  remainingAccounts: AccountMeta[] = []
) {
  const { marginfiAccount, bank, destinationTokenAccount, tokenProgram, ...optionalAccounts } = accounts;

  return mfProgram.methods
    .lendingAccountWithdraw(args.amount, args.withdrawAll ?? null)
    .accounts({
      marginfiAccount,
      destinationTokenAccount,
      bank,
      tokenProgram,
    })
    .accountsPartial(optionalAccounts)
    .remainingAccounts(remainingAccounts)
    .instruction();
}

async function makeBorrowIx(
  mfProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    marginfiAccount: PublicKey;
    bank: PublicKey;
    destinationTokenAccount: PublicKey;
    tokenProgram: PublicKey;
    // Optional accounts - to override inference
    group?: PublicKey;
    authority?: PublicKey;
  },
  args: {
    amount: BN;
  },
  remainingAccounts: AccountMeta[] = []
) {
  const { marginfiAccount, bank, destinationTokenAccount, tokenProgram, ...optionalAccounts } = accounts;

  return mfProgram.methods
    .lendingAccountBorrow(args.amount)
    .accounts({
      marginfiAccount,
      destinationTokenAccount,
      bank,
      tokenProgram,
    })
    .accountsPartial(optionalAccounts)
    .remainingAccounts(remainingAccounts)
    .instruction();
}

function makeLendingAccountLiquidateIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    assetBank: PublicKey;
    liabBank: PublicKey;
    liquidatorMarginfiAccount: PublicKey;
    liquidateeMarginfiAccount: PublicKey;
    tokenProgram: PublicKey;
    // Optional accounts - to override inference
    group: PublicKey;
    authority: PublicKey;
  },
  args: {
    assetAmount: BN;
  },
  remainingAccounts: AccountMeta[] = []
) {
  const {
    assetBank,
    liabBank,
    liquidatorMarginfiAccount,
    liquidateeMarginfiAccount,
    tokenProgram,
    ...optionalAccounts
  } = accounts;

  return mfiProgram.methods
    .lendingAccountLiquidate(args.assetAmount)
    .accounts({
      assetBank,
      liabBank,
      liquidatorMarginfiAccount,
      liquidateeMarginfiAccount,
      tokenProgram,
    })
    .accountsPartial(optionalAccounts)
    .remainingAccounts(remainingAccounts)
    .instruction();
}

function makelendingAccountWithdrawEmissionIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    marginfiAccount: PublicKey;
    destinationAccount: PublicKey;
    bank: PublicKey;
    tokenProgram: PublicKey;
    // Optional accounts - to override inference
    group?: PublicKey;
    authority?: PublicKey;
    emissionsMint?: PublicKey;
  }
) {
  const { marginfiAccount, destinationAccount, bank, tokenProgram, ...optionalAccounts } = accounts;

  return mfiProgram.methods
    .lendingAccountWithdrawEmissions()
    .accounts({
      marginfiAccount,
      destinationAccount,
      bank,
      tokenProgram,
    })
    .accountsPartial(optionalAccounts)
    .instruction();
}

function makeSetAccountFlagIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    marginfiAccount: PublicKey;
    // Optional accounts - to override inference
    group?: PublicKey;
    admin?: PublicKey;
  },
  args: {
    flag: BN;
  }
) {
  const { marginfiAccount, ...optionalAccounts } = accounts;

  return mfiProgram.methods
    .setAccountFlag(args.flag)
    .accounts({
      marginfiAccount,
    })
    .accountsPartial(optionalAccounts)
    .instruction();
}

function makeUnsetAccountFlagIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    marginfiAccount: PublicKey;
    // Optional accounts - to override inference
    group?: PublicKey;
    admin?: PublicKey;
  },
  args: {
    flag: BN;
  }
) {
  const { marginfiAccount, ...optionalAccounts } = accounts;

  return mfiProgram.methods
    .unsetAccountFlag(args.flag)
    .accounts({
      marginfiAccount,
    })
    .accountsPartial(optionalAccounts)
    .instruction();
}

function makePoolConfigureBankIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    bank: PublicKey;
    // Optional accounts - to override inference
    group?: PublicKey;
    admin?: PublicKey;
  },
  args: {
    bankConfigOpt: BankConfigOptRaw;
  }
) {
  const { bank, ...optionalAccounts } = accounts;

  return mfiProgram.methods
    .lendingPoolConfigureBank(args.bankConfigOpt)
    .accounts({
      bank,
    })
    .accountsPartial(optionalAccounts)
    .instruction();
}

function makeBeginFlashLoanIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    marginfiAccount: PublicKey;
    // Optional accounts - to override inference
    authority?: PublicKey;
    ixsSysvar?: PublicKey;
  },
  args: {
    endIndex: BN;
  }
) {
  const { marginfiAccount, ...optionalAccounts } = accounts;

  return mfiProgram.methods
    .lendingAccountStartFlashloan(args.endIndex)
    .accounts({
      marginfiAccount,
    })
    .accountsPartial(optionalAccounts)
    .instruction();
}

function makeEndFlashLoanIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    marginfiAccount: PublicKey;
    // Optional accounts - to override inference
    authority?: PublicKey;
  },
  remainingAccounts: AccountMeta[] = []
) {
  const { marginfiAccount, ...optionalAccounts } = accounts;

  return mfiProgram.methods
    .lendingAccountEndFlashloan()
    .accounts({
      marginfiAccount,
    })
    .accountsPartial(optionalAccounts)
    .remainingAccounts(remainingAccounts)
    .instruction();
}

async function makeAccountAuthorityTransferIx(
  mfProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    marginfiAccount: PublicKey;
    newAuthority: PublicKey;
    feePayer: PublicKey;
    // Optional accounts - to override inference
    group?: PublicKey;
    authority?: PublicKey;
  }
) {
  const { marginfiAccount, newAuthority, feePayer, ...optionalAccounts } = accounts;

  return mfProgram.methods
    .setNewAccountAuthority()
    .accounts({
      marginfiAccount,
      newAuthority,
      feePayer,
    })
    .accountsPartial(optionalAccounts)
    .instruction();
}

async function makeGroupInitIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiGroup: PublicKey;
    admin: PublicKey;
  },
  args: {
    isArenaGroup: boolean;
  }
) {
  return mfProgram.methods
    .marginfiGroupInitialize(args.isArenaGroup)
    .accounts({
      marginfiGroup: accounts.marginfiGroup,
      admin: accounts.admin,
    })
    .instruction();
}

/**
 * Configure the oracle for a bank
 * @param mfProgram The marginfi program
 * @param accounts The accounts required for this instruction
 * @param args The oracle setup index and feed id
 * @param remainingAccounts The remaining accounts required for this instruction, should include the feed oracle key
 */
async function makeLendingPoolConfigureBankOracleIx(
  mfProgram: MarginfiProgram,
  accounts: {
    // Required accounts
    bank: PublicKey;
    // Optional accounts - to override inference
    group?: PublicKey;
    admin?: PublicKey;
  },
  args: {
    /**
     * The oracle setup index, see {@link serializeOracleSetupToIndex}
     */
    setup: number;
    /**
     * The oracle feed id
     */
    feedId: PublicKey;
  },
  /**
   * The remaining accounts required for this instruction, should include the feed oracle key (non writable & signable)
   */
  remainingAccounts: AccountMeta[] = []
) {
  const { bank, ...optionalAccounts } = accounts;

  return mfProgram.methods
    .lendingPoolConfigureBankOracle(args.setup, args.feedId)
    .accounts({
      bank,
    })
    .accountsPartial(optionalAccounts)
    .remainingAccounts(remainingAccounts)
    .instruction();
}

async function makePoolAddPermissionlessStakedBankIx(
  mfProgram: MarginfiProgram,
  accounts: {
    stakedSettings: PublicKey;
    feePayer: PublicKey;
    bankMint: PublicKey;
    solPool: PublicKey;
    stakePool: PublicKey;
  },
  remainingAccounts: {
    pythOracle: PublicKey;
  },
  args: {
    seed: BN;
  }
) {
  const defaultAccountMeta = {
    isSigner: false,
    isWritable: false,
  };

  return mfProgram.methods
    .lendingPoolAddBankPermissionless(args.seed)
    .accounts({
      ...accounts,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts([
      { ...defaultAccountMeta, pubkey: remainingAccounts.pythOracle },
      { ...defaultAccountMeta, pubkey: accounts.bankMint },
      { ...defaultAccountMeta, pubkey: accounts.solPool },
    ])
    .instruction();
}

async function makePoolAddBankIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiGroup: PublicKey;
    admin: PublicKey;
    feePayer: PublicKey;
    bankMint: PublicKey;
    bank: PublicKey;
    tokenProgram: PublicKey;
  },
  args: {
    bankConfig: BankConfigCompactRaw;
  }
) {
  return mfProgram.methods
    .lendingPoolAddBank({
      ...args.bankConfig,
      pad0: [0, 0, 0, 0, 0, 0, 0, 0],
    })
    .accounts({
      marginfiGroup: accounts.marginfiGroup,
      admin: accounts.admin,
      feePayer: accounts.feePayer,
      bankMint: accounts.bankMint,
      bank: accounts.bank,
      tokenProgram: accounts.tokenProgram,
    })
    .instruction();
}

async function makeCloseAccountIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiAccountPk: PublicKey;
    feePayerPk: PublicKey;
    authorityPk: PublicKey;
  }
) {
  return mfProgram.methods
    .marginfiAccountClose()
    .accounts({
      marginfiAccount: accounts.marginfiAccountPk,
      feePayer: accounts.feePayerPk,
      authority: accounts.authorityPk,
    })
    .instruction();
}

const instructions = {
  makeDepositIx,
  makeRepayIx,
  makeWithdrawIx,
  makeBorrowIx,
  makeInitMarginfiAccountIx,
  makeLendingAccountLiquidateIx,
  makelendingAccountWithdrawEmissionIx,
  makeSetAccountFlagIx,
  makeUnsetAccountFlagIx,
  makePoolAddBankIx,
  makePoolConfigureBankIx,
  makeBeginFlashLoanIx,
  makeEndFlashLoanIx,
  makeAccountAuthorityTransferIx,
  makeGroupInitIx,
  makeCloseAccountIx,
  makePoolAddPermissionlessStakedBankIx,
  makeLendingPoolConfigureBankOracleIx,
};

export default instructions;
