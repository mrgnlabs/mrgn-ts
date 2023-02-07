import { AccountMeta, PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { MarginfiProgram } from "./types";

async function makeInitMarginfiAccountIx(
  mfProgram: MarginfiProgram,
  accounts: {
    marginfiGroupPk: PublicKey;
    marginfiAccountPk: PublicKey;
    signerPk: PublicKey;
  }
) {
  return mfProgram.methods
    .marginfiAccountInitialize()
    .accounts({
      marginfiGroup: accounts.marginfiGroupPk,
      marginfiAccount: accounts.marginfiAccountPk,
      signer: accounts.signerPk,
      systemProgram: SystemProgram.programId,
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

const instructions = {
  makeDepositIx,
  makeRepayIx,
  makeWithdrawIx,
  makeBorrowIx,
  makeInitMarginfiAccountIx,
  makeLendingAccountLiquidateIx,
};

export default instructions;
