import { AccountMeta, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { MarginfiProgram } from "./types";
import { BankConfigOptRaw, BankConfigCompactRaw } from "./models/bank";
import { TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";

async function makeInitMarginfiAccountIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiGroupPk: PublicKey;
    marginfiAccountPk: PublicKey;
    authorityPk: PublicKey;
    feePayerPk: PublicKey;
  }
) {
  return mfProgram.methods
    .marginfiAccountInitialize()
    .accounts({
      marginfiGroup: accounts.marginfiGroupPk,
      marginfiAccount: accounts.marginfiAccountPk,
      authority: accounts.authorityPk,
      feePayer: accounts.feePayerPk,
    })
    .instruction();
}

async function makeDepositIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiGroupPk: PublicKey;
    marginfiAccountPk: PublicKey;
    authorityPk: PublicKey;
    signerTokenAccountPk: PublicKey;
    bankPk: PublicKey;
    tokenProgramPk: PublicKey;
  },
  args: {
    amount: BN;
  },
  remainingAccounts: AccountMeta[] = []
) {
  return mfProgram.methods
    .lendingAccountDeposit(args.amount)
    .accounts({
      marginfiGroup: accounts.marginfiGroupPk,
      marginfiAccount: accounts.marginfiAccountPk,
      signer: accounts.authorityPk,
      signerTokenAccount: accounts.signerTokenAccountPk,
      bank: accounts.bankPk,
      tokenProgram: accounts.tokenProgramPk,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
}

async function makeRepayIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiGroupPk: PublicKey;
    marginfiAccountPk: PublicKey;
    authorityPk: PublicKey;
    signerTokenAccountPk: PublicKey;
    bankPk: PublicKey;
    tokenProgramPk: PublicKey;
  },
  args: {
    amount: BN;
    repayAll?: boolean;
  },
  remainingAccounts: AccountMeta[] = []
) {
  return mfProgram.methods
    .lendingAccountRepay(args.amount, args.repayAll ?? null)
    .accounts({
      marginfiGroup: accounts.marginfiGroupPk,
      marginfiAccount: accounts.marginfiAccountPk,
      signer: accounts.authorityPk,
      signerTokenAccount: accounts.signerTokenAccountPk,
      bank: accounts.bankPk,
      tokenProgram: accounts.tokenProgramPk,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
}

async function makeWithdrawIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiGroupPk: PublicKey;
    marginfiAccountPk: PublicKey;
    signerPk: PublicKey;
    bankPk: PublicKey;
    destinationTokenAccountPk: PublicKey;
    tokenProgramPk: PublicKey;
  },
  args: {
    amount: BN;
    withdrawAll?: boolean;
  },
  remainingAccounts: AccountMeta[] = []
) {
  return mfProgram.methods
    .lendingAccountWithdraw(args.amount, args.withdrawAll ?? null)
    .accounts({
      marginfiGroup: accounts.marginfiGroupPk,
      marginfiAccount: accounts.marginfiAccountPk,
      signer: accounts.signerPk,
      destinationTokenAccount: accounts.destinationTokenAccountPk,
      bank: accounts.bankPk,
      tokenProgram: accounts.tokenProgramPk,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
}

async function makeBorrowIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiGroupPk: PublicKey;
    marginfiAccountPk: PublicKey;
    signerPk: PublicKey;
    bankPk: PublicKey;
    destinationTokenAccountPk: PublicKey;
    tokenProgramPk: PublicKey;
  },
  args: {
    amount: BN;
  },
  remainingAccounts: AccountMeta[] = []
) {
  return mfProgram.methods
    .lendingAccountBorrow(args.amount)
    .accounts({
      marginfiGroup: accounts.marginfiGroupPk,
      marginfiAccount: accounts.marginfiAccountPk,
      signer: accounts.signerPk,
      destinationTokenAccount: accounts.destinationTokenAccountPk,
      bank: accounts.bankPk,
      tokenProgram: accounts.tokenProgramPk,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
}

function makeLendingAccountLiquidateIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    marginfiGroup: PublicKey;
    signer: PublicKey;
    assetBank: PublicKey;
    liabBank: PublicKey;
    liquidatorMarginfiAccount: PublicKey;
    liquidateeMarginfiAccount: PublicKey;
    tokenProgramPk: PublicKey;
  },
  args: {
    assetAmount: BN;
  },
  remainingAccounts: AccountMeta[] = []
) {
  return mfiProgram.methods
    .lendingAccountLiquidate(args.assetAmount)
    .accounts({
      marginfiGroup: accounts.marginfiGroup,
      signer: accounts.signer,
      assetBank: accounts.assetBank,
      liabBank: accounts.liabBank,
      liquidatorMarginfiAccount: accounts.liquidatorMarginfiAccount,
      liquidateeMarginfiAccount: accounts.liquidateeMarginfiAccount,
      tokenProgram: accounts.tokenProgramPk,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
}

function makelendingAccountWithdrawEmissionIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    marginfiGroup: PublicKey;
    marginfiAccount: PublicKey;
    signer: PublicKey;
    destinationTokenAccount: PublicKey;
    bank: PublicKey;
    emissionsMint: PublicKey;
  }
) {
  return mfiProgram.methods
    .lendingAccountWithdrawEmissions()
    .accounts({
      marginfiGroup: accounts.marginfiGroup,
      marginfiAccount: accounts.marginfiAccount,
      signer: accounts.signer,
      destinationAccount: accounts.destinationTokenAccount,
      bank: accounts.bank,
      emissionsMint: accounts.emissionsMint,
      tokenProgram: TOKEN_PROGRAM_ID
    })
    .instruction();
}

function makeSetAccountFlagIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    marginfiGroup: PublicKey;
    marginfiAccount: PublicKey;
    admin: PublicKey;
  },
  args: {
    flag: BN;
  }
) {
  return mfiProgram.methods
    .setAccountFlag(args.flag)
    .accounts({
      marginfiGroup: accounts.marginfiGroup,
      marginfiAccount: accounts.marginfiAccount,
      admin: accounts.admin,
    })
    .instruction();
}

function makeUnsetAccountFlagIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    marginfiGroup: PublicKey;
    marginfiAccount: PublicKey;
    admin: PublicKey;
  },
  args: {
    flag: BN;
  }
) {
  return mfiProgram.methods
    .unsetAccountFlag(args.flag)
    .accounts({
      marginfiGroup: accounts.marginfiGroup,
      marginfiAccount: accounts.marginfiAccount,
      admin: accounts.admin,
    })
    .instruction();
}

function makePoolConfigureBankIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    marginfiGroup: PublicKey;
    admin: PublicKey;
    bank: PublicKey;
  },
  args: {
    bankConfigOpt: BankConfigOptRaw;
  }
) {
  return mfiProgram.methods
    .lendingPoolConfigureBank(args.bankConfigOpt)
    .accounts({
      marginfiGroup: accounts.marginfiGroup,
      admin: accounts.admin,
      bank: accounts.bank,
    })
    .instruction();
}

function makeBeginFlashLoanIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    marginfiAccount: PublicKey;
    signer: PublicKey;
  },
  args: {
    endIndex: BN;
  }
) {
  return mfiProgram.methods
    .lendingAccountStartFlashloan(args.endIndex)
    .accountsStrict({
      marginfiAccount: accounts.marginfiAccount,
      signer: accounts.signer,
      ixsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
    })
    .instruction();
}

function makeEndFlashLoanIx(
  mfiProgram: MarginfiProgram,
  accounts: {
    marginfiAccount: PublicKey;
    signer: PublicKey;
  },
  remainingAccounts: AccountMeta[] = []
) {
  return mfiProgram.methods
    .lendingAccountEndFlashloan()
    .accountsStrict({
      marginfiAccount: accounts.marginfiAccount,
      signer: accounts.signer,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
}

async function makeAccountAuthorityTransferIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiAccountPk: PublicKey;
    marginfiGroupPk: PublicKey;
    signerPk: PublicKey;
    newAuthorityPk: PublicKey;
    feePayerPk: PublicKey;
  }
) {
  return mfProgram.methods
    .setNewAccountAuthority()
    .accounts({
      marginfiAccount: accounts.marginfiAccountPk,
      marginfiGroup: accounts.marginfiGroupPk,
      signer: accounts.signerPk,
      newAuthority: accounts.newAuthorityPk,
      feePayer: accounts.feePayerPk,
    })
    .instruction();
}

async function makeGroupInitIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiGroupPk: PublicKey;
    adminPk: PublicKey;
  }
) {
  return mfProgram.methods
    .marginfiGroupInitialize()
    .accounts({
      marginfiGroup: accounts.marginfiGroupPk,
      admin: accounts.adminPk,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

async function makeLendindingPoolAddBankIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiGroupPk: PublicKey;
    adminPk: PublicKey;
    feePayerPk: PublicKey;
    bankMintPk: PublicKey;
    bankPk: PublicKey;
    liquidityVaultAuthorityPk: PublicKey;
    liquidityVaultPk: PublicKey;
    insuranceVaultAuthorityPk: PublicKey;
    insuranceVaultPk: PublicKey;
    feeVaultAuthorityPk: PublicKey;
    feeVaultPk: PublicKey;
    rentPk: PublicKey;
    tokenProgramPk: PublicKey;
    systemProgramPk: PublicKey;
  },
  args: {
    bankConfig: BankConfigCompactRaw;
    seed: BN;
  }
) {
  return mfProgram.methods
    .lendingPoolAddBankWithSeed(args.bankConfig, args.seed)
    .accounts({
      marginfiGroup: accounts.marginfiGroupPk,
      admin: accounts.adminPk,
      bank: accounts.bankPk,
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
  makePoolConfigureBankIx,
  makeBeginFlashLoanIx,
  makeEndFlashLoanIx,
  makeAccountAuthorityTransferIx,
  makeGroupInitIx,
};

export default instructions;
