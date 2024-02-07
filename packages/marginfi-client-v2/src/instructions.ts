import { AccountMeta, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { MarginfiProgram } from "./types";
import { BankConfigOptRaw } from "./models/bank";

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
      systemProgram: SystemProgram.programId,
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
  },
  args: {
    amount: BN;
  }
) {
  return mfProgram.methods
    .lendingAccountDeposit(args.amount)
    .accounts({
      marginfiGroup: accounts.marginfiGroupPk,
      marginfiAccount: accounts.marginfiAccountPk,
      signer: accounts.authorityPk,
      signerTokenAccount: accounts.signerTokenAccountPk,
      bank: accounts.bankPk,
    })
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
  },
  args: {
    amount: BN;
    repayAll?: boolean;
  }
) {
  return mfProgram.methods
    .lendingAccountRepay(args.amount, args.repayAll ?? null)
    .accounts({
      marginfiGroup: accounts.marginfiGroupPk,
      marginfiAccount: accounts.marginfiAccountPk,
      signer: accounts.authorityPk,
      signerTokenAccount: accounts.signerTokenAccountPk,
      bank: accounts.bankPk,
    })
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
  },
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
};

export default instructions;
