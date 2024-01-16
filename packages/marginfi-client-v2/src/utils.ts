import {
  AddressLookupTableAccount,
  Blockhash,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  PDA_BANK_FEE_VAULT_AUTH_SEED,
  PDA_BANK_FEE_VAULT_SEED,
  PDA_BANK_INSURANCE_VAULT_AUTH_SEED,
  PDA_BANK_INSURANCE_VAULT_SEED,
  PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED,
  PDA_BANK_LIQUIDITY_VAULT_SEED,
} from "./constants";
import { BankVaultType } from "./types";
import {
  NATIVE_MINT,
  createAssociatedTokenAccountIdempotentInstruction,
  uiToNative,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";

export function getBankVaultSeeds(type: BankVaultType): Buffer {
  switch (type) {
    case BankVaultType.LiquidityVault:
      return PDA_BANK_LIQUIDITY_VAULT_SEED;
    case BankVaultType.InsuranceVault:
      return PDA_BANK_INSURANCE_VAULT_SEED;
    case BankVaultType.FeeVault:
      return PDA_BANK_FEE_VAULT_SEED;
    default:
      throw Error(`Unknown vault type ${type}`);
  }
}

function getBankVaultAuthoritySeeds(type: BankVaultType): Buffer {
  switch (type) {
    case BankVaultType.LiquidityVault:
      return PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED;
    case BankVaultType.InsuranceVault:
      return PDA_BANK_INSURANCE_VAULT_AUTH_SEED;
    case BankVaultType.FeeVault:
      return PDA_BANK_FEE_VAULT_AUTH_SEED;
    default:
      throw Error(`Unknown vault type ${type}`);
  }
}

/**
 * Compute authority PDA for a specific marginfi group bank vault
 */
export function getBankVaultAuthority(
  bankVaultType: BankVaultType,
  bankPk: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([getBankVaultAuthoritySeeds(bankVaultType), bankPk.toBuffer()], programId);
}

export function makeWrapSolIxs(walletAddress: PublicKey, amount: BigNumber): TransactionInstruction[] {
  const address = getAssociatedTokenAddressSync(NATIVE_MINT, walletAddress, true);
  const ixs = [createAssociatedTokenAccountIdempotentInstruction(walletAddress, address, walletAddress, NATIVE_MINT)];

  if (amount.gt(0)) {
    const nativeAmount = uiToNative(amount, 9).toNumber() + 10000;
    ixs.push(
      SystemProgram.transfer({ fromPubkey: walletAddress, toPubkey: address, lamports: nativeAmount }),
      createSyncNativeInstruction(address)
    );
  }

  return ixs;
}

export function makeUnwrapSolIx(walletAddress: PublicKey): TransactionInstruction {
  const address = getAssociatedTokenAddressSync(NATIVE_MINT, walletAddress, true); // We allow off curve addresses here to support Fuse.
  return createCloseAccountInstruction(address, walletAddress, walletAddress);
}

export async function makeVersionedTransaction(
  blockhash: Blockhash,
  transaction: Transaction,
  payer: PublicKey,
  addressLookupTables?: AddressLookupTableAccount[]
): Promise<VersionedTransaction> {
  const message = new TransactionMessage({
    instructions: transaction.instructions,
    payerKey: payer,
    recentBlockhash: blockhash,
  });

  const versionedMessage = addressLookupTables
    ? message.compileToV0Message(addressLookupTables)
    : message.compileToLegacyMessage();

  return new VersionedTransaction(versionedMessage);
}
