import {
  AddressLookupTableAccount,
  Blockhash,
  ComputeBudgetProgram,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

import { Program } from "@mrgnlabs/mrgn-common";
import {
  PDA_BANK_FEE_VAULT_AUTH_SEED,
  PDA_BANK_FEE_VAULT_SEED,
  PDA_BANK_INSURANCE_VAULT_AUTH_SEED,
  PDA_BANK_INSURANCE_VAULT_SEED,
  PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED,
  PDA_BANK_LIQUIDITY_VAULT_SEED,
  PYTH_PUSH_ORACLE_ID,
} from "./constants";
import { BankVaultType, MarginfiProgram } from "./types";
import {
  NATIVE_MINT,
  createAssociatedTokenAccountIdempotentInstruction,
  uiToNative,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { BankConfig, BankConfigRaw, OracleSetup, parseOracleSetup } from ".";
import { parsePriceInfo } from "./vendor";

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
/**
 * Creates a compute budget instruction to set the priority fee for a transaction.
 * The priority fee is specified in micro-lamports per compute unit.
 *
 * @param priorityFeeMicro - Priority fee in micro-lamports per compute unit. If not provided, defaults to 1.
 * @returns A compute budget instruction with the specified priority fee
 */
export function makePriorityFeeMicroIx(priorityFeeMicro?: number): TransactionInstruction {
  return ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: Math.floor(priorityFeeMicro ?? 1),
  });
}

/*
  deprecated use makePriorityFeeMicroIx instead
*/
export function makePriorityFeeIx(priorityFeeUi?: number, computeUnitsLimit?: number): TransactionInstruction[] {
  const priorityFeeIx: TransactionInstruction[] = [];
  const limit = computeUnitsLimit ?? 1_400_000;

  let microLamports: number = 1;

  if (priorityFeeUi) {
    // if priority fee is above 0.2 SOL discard it for safety reasons
    const isAbsurdPriorityFee = priorityFeeUi > 0.1;

    if (!isAbsurdPriorityFee) {
      const priorityFeeMicroLamports = priorityFeeUi * LAMPORTS_PER_SOL * 1_000_000;
      microLamports = Math.round(priorityFeeMicroLamports / limit);
    }
  }

  priorityFeeIx.push(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports,
    })
  );

  return priorityFeeIx;
}

export function feedIdToString(feedId: PublicKey): string {
  return feedId.toBuffer().toString("hex");
}

export type PythPushFeedIdMap = Map<string, PublicKey>;

export async function buildFeedIdMap(bankConfigs: BankConfigRaw[], connection: Connection): Promise<PythPushFeedIdMap> {
  const feedIdMap: PythPushFeedIdMap = new Map<string, PublicKey>();

  const feedIdsWithAddresses = bankConfigs
    .filter((bankConfig) => parseOracleSetup(bankConfig.oracleSetup) == OracleSetup.PythPushOracle)
    .map((bankConfig) => {
      let feedId = bankConfig.oracleKeys[0].toBuffer();
      return {
        feedId,
        addresses: [
          findPythPushOracleAddress(feedId, PYTH_PUSH_ORACLE_ID, PYTH_SPONSORED_SHARD_ID),
          findPythPushOracleAddress(feedId, PYTH_PUSH_ORACLE_ID, MARGINFI_SPONSORED_SHARD_ID),
        ],
      };
    })
    .flat();

  const addressess = feedIdsWithAddresses.map((feedIdWithAddress) => feedIdWithAddress.addresses).flat();
  const accountInfos = [];

  const chunkSize = 25;
  for (let i = 0; i < addressess.length; i += chunkSize) {
    const chunk = addressess.slice(i, i + chunkSize);
    const accountInfosChunk = await connection.getMultipleAccountsInfo(chunk);
    accountInfos.push(...accountInfosChunk);
  }

  for (let i = 0; i < feedIdsWithAddresses.length; i++) {
    const oraclesStartIndex = i * 2;

    const pythSponsoredOracle = accountInfos[oraclesStartIndex];
    const mfiSponsoredOracle = accountInfos[oraclesStartIndex + 1];

    const feedId = feedIdsWithAddresses[i].feedId.toString("hex");

    if (mfiSponsoredOracle && pythSponsoredOracle) {
      let pythPriceAccount = parsePriceInfo(pythSponsoredOracle.data.slice(8));
      let pythPublishTime = pythPriceAccount.priceMessage.publishTime;

      let mfiPriceAccount = parsePriceInfo(mfiSponsoredOracle.data.slice(8));
      let mfiPublishTime = mfiPriceAccount.priceMessage.publishTime;

      if (pythPublishTime > mfiPublishTime) {
        feedIdMap.set(feedId, feedIdsWithAddresses[i].addresses[0]);
      } else {
        feedIdMap.set(feedId, feedIdsWithAddresses[i].addresses[1]);
      }
    } else if (pythSponsoredOracle) {
      feedIdMap.set(feedId, feedIdsWithAddresses[i].addresses[0]);
    } else if (mfiSponsoredOracle) {
      feedIdMap.set(feedId, feedIdsWithAddresses[i].addresses[1]);
    } else {
      throw new Error(`No oracle found for feedId: ${feedId}, either Pyth or MFI sponsored oracle must exist`);
    }
  }

  return feedIdMap;
}

export function findOracleKey(bankConfig: BankConfig, feedMap: PythPushFeedIdMap): PublicKey {
  const oracleSetup = bankConfig.oracleSetup;
  let oracleKey = bankConfig.oracleKeys[0];

  if (oracleSetup == OracleSetup.PythPushOracle || oracleSetup == OracleSetup.StakedWithPythPush) {
    const feedId = feedIdToString(oracleKey);
    const maybeOracleKey = feedMap.get(feedId);
    if (!maybeOracleKey) {
      throw new Error(`No oracle key found for feedId: ${feedId}`);
    }
    oracleKey = maybeOracleKey;
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
