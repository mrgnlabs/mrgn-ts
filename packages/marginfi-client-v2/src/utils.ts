import {
  AddressLookupTableAccount,
  Blockhash,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
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
  PYTH_PUSH_ORACLE_PROGRAM_ID,
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
import { BankConfigRaw, OracleSetup, parseOracleSetup } from ".";
import { readBigUInt64LE } from "./vendor/pyth_legacy/readBig";

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

export function makePriorityFeeIx(priorityFeeUi?: number): TransactionInstruction[] {
  const priorityFeeIx: TransactionInstruction[] = [];
  const limitCU = 1_400_000;

  let microLamports: number = 1;

  if (priorityFeeUi) {
    // if priority fee is above 0.2 SOL discard it for safety reasons
    const isAbsurdPriorityFee = priorityFeeUi > 0.2;

    if (!isAbsurdPriorityFee) {
      const priorityFeeMicroLamports = priorityFeeUi * LAMPORTS_PER_SOL * 1_000_000;
      microLamports = Math.round(priorityFeeMicroLamports / limitCU);
    }
  }

  priorityFeeIx.push(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports,
    })
  );

  return priorityFeeIx;
}

export function findOracleKeys(bankConfigRaw: BankConfigRaw): PublicKey[] {
  const oracleSetup = parseOracleSetup(bankConfigRaw.oracleSetup);
  let oracleKey = [bankConfigRaw.oracleKeys[0]];

  if (oracleSetup == OracleSetup.PythPushOracle) {
    let feedId = bankConfigRaw.oracleKeys[0].toBuffer();

    oracleKey = [
      findPythPushOracleAddress(feedId, PYTH_PUSH_ORACLE_PROGRAM_ID, PYTH_SPONSORED_SHARD_ID),
      findPythPushOracleAddress(feedId, PYTH_PUSH_ORACLE_PROGRAM_ID, MARGINFI_SPONSORED_SHARD_ID),
    ];
  }

  return oracleKey;
}

export const PYTH_SPONSORED_SHARD_ID = 0;
export const MARGINFI_SPONSORED_SHARD_ID = 3301;

export function findPythPushOracleAddress(feedId: Buffer, programId: PublicKey, shardId: number): PublicKey {
  const shardBytes = u16ToArrayBufferLE(shardId);
  return PublicKey.findProgramAddressSync([shardBytes, feedId], programId)[0];
}

function u16ToArrayBufferLE(value: number): Uint8Array {
  // Create a buffer of 2 bytes
  const buffer = new ArrayBuffer(2);
  const dataView = new DataView(buffer);

  // Set the Uint16 value in little-endian order
  dataView.setUint16(0, value, true);

  // Return the buffer
  return new Uint8Array(buffer);
}