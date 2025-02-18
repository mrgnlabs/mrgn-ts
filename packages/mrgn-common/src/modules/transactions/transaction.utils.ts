import { BorshInstructionCoder, Idl, Instruction } from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  MessageV0,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { ExtendedTransactionProperties, SolanaTransaction, TransactionType } from "./transaction.types";

/**
 * Determines if a given transaction is a VersionedTransaction.
 * This function checks for the presence of a 'message' property to identify
 * if the transaction is of type VersionedTransaction.
 *
 * @param tx - The transaction object, which can be either a VersionedTransaction or a Transaction.
 * @returns A boolean indicating whether the transaction is a VersionedTransaction.
 */
export function isV0Tx(tx: Transaction | VersionedTransaction): tx is VersionedTransaction {
  return "message" in tx;
}

/**
 * Calculates the size of a Solana transaction in bytes.
 * This function considers the number of required signatures and other transaction components.
 *
 * @param tx - The transaction object, which can be either a VersionedTransaction or a Transaction.
 * @returns The size of the transaction in bytes.
 */
export function getTxSize(tx: VersionedTransaction | Transaction): number {
  const isVersioned = isV0Tx(tx);
  const numSigners = tx.signatures.length;
  const numRequiredSignatures = isVersioned ? tx.message.header.numRequiredSignatures : 0;
  const feePayerSize = isVersioned || tx.feePayer ? 0 : 32;
  const signaturesSize = (numRequiredSignatures - numSigners) * 64 + 1;

  try {
    const baseTxSize = isVersioned
      ? tx.serialize().length
      : tx.serialize({ requireAllSignatures: false, verifySignatures: false }).length;
    return baseTxSize + feePayerSize + signaturesSize;
  } catch (error) {
    // tx is overflowing
    return 9999;
  }
}

export function getAccountKeys(
  tx: VersionedTransaction | Transaction,
  lookupTableAccounts: AddressLookupTableAccount[]
): number {
  const isVersioned = isV0Tx(tx);

  try {
    if (isVersioned) {
      const message = TransactionMessage.decompile(tx.message, { addressLookupTableAccounts: lookupTableAccounts });
      return message.compileToLegacyMessage().getAccountKeys().length;
    } else {
      return tx.compileMessage().getAccountKeys().length;
    }
  } catch (error) {
    return 9999;
  }
}

/**
 * Decodes a Solana transaction instruction using the provided Interface Definition Language (IDL).
 * This function utilizes the BorshInstructionCoder to interpret the encoded instruction data.
 *
 * @param idl - The Interface Definition Language object that defines the structure of the instruction.
 * @param encoded - The Buffer containing the encoded instruction data.
 * @returns The decoded instruction object.
 */
export function decodeInstruction(idl: Idl, encoded: Buffer): Instruction | null {
  const coder = new BorshInstructionCoder(idl);
  return coder.decode(encoded, "base58");
}

/**
 * Decompiles a VersionedTransaction into a TransactionMessage.
 *
 * @param tx - The VersionedTransaction to be decompiled.
 * @param lookupTableAccounts - An array of AddressLookupTableAccount used for decompiling the transaction message.
 * @returns A TransactionMessage object representing the decompiled transaction.
 */
export function decompileV0Transaction(tx: VersionedTransaction, lookupTableAccounts: AddressLookupTableAccount[]) {
  return TransactionMessage.decompile(tx.message, { addressLookupTableAccounts: lookupTableAccounts });
}

/**
 * Options for updating a transaction.
 * - `feePayer`: Optional public key of the fee payer. Defaults to the transaction's fee payer.
 * - `blockhash`: Optional blockhash for the transaction. Defaults to the transaction's recent blockhash.
 * - `addressLookupTables`: Optional array of address lookup table accounts for the transaction.
 * - `additionalIxs`: Optional array of additional transaction instructions to include.
 */
type UpdateTxOptions = {
  feePayer?: PublicKey;
  blockhash?: string;
  addressLookupTables?: AddressLookupTableAccount[];
  additionalIxs?: TransactionInstruction[];
  replaceOnly?: boolean;
};

/**
 * Converts a legacy Solana transaction to a versioned transaction. *
 * @param transaction - The legacy transaction to be converted.
 * @param opts - Optional parameters for the conversion process.
 * @returns A VersionedTransaction object representing the converted transaction.
 * @throws Will throw an error if the fee payer or blockhash is not provided.
 */
export function legacyTxToV0Tx(transaction: Transaction, opts?: UpdateTxOptions): VersionedTransaction {
  const feePayer = opts?.feePayer ?? transaction.feePayer;
  const blockhash = opts?.blockhash ?? transaction.recentBlockhash;
  const additionalIxs = opts?.additionalIxs ?? [];
  const addressLookupTables = opts?.addressLookupTables ?? [];

  if (!feePayer || !blockhash) {
    throw new Error("Fee payer and blockhash are required");
  }

  const ixs = transaction.instructions;
  const versionedMessage = new TransactionMessage({
    instructions: [...additionalIxs, ...ixs],
    payerKey: feePayer,
    recentBlockhash: blockhash,
  });
  return new VersionedTransaction(versionedMessage.compileToV0Message(addressLookupTables));
}

/**
 * Updates a VersionedTransaction with new options.
 *
 * This function allows you to modify a given VersionedTransaction by providing
 * additional transaction instructions, address lookup tables, a new fee payer,
 * and a new blockhash. It decompiles the existing transaction, applies the updates,
 * and recompiles it into a new VersionedTransaction.
 *
 * @param transaction - The VersionedTransaction to be updated.
 * @param opts - Optional parameters for updating the transaction.
 * @returns A new VersionedTransaction object with the applied updates.
 * @throws Will throw an error if the fee payer or blockhash is not provided.
 */
export function updateV0Tx(transaction: VersionedTransaction, opts?: UpdateTxOptions): VersionedTransaction {
  const additionalIxs = opts?.additionalIxs ?? [];
  const addressLookupTables = opts?.addressLookupTables ?? [];
  let instructions: TransactionInstruction[] = [];

  const message = decompileV0Transaction(transaction, addressLookupTables);
  const feePayer = opts?.feePayer ?? message.payerKey;
  const blockhash = opts?.blockhash ?? message.recentBlockhash;

  if (additionalIxs.length > 0) {
    instructions = replaceV0TxInstructions(additionalIxs, message.instructions, opts?.replaceOnly);
  } else {
    instructions = message.instructions;
  }

  const versionedMessage = new TransactionMessage({
    instructions,
    payerKey: feePayer,
    recentBlockhash: blockhash,
  });
  return new VersionedTransaction(versionedMessage.compileToV0Message(addressLookupTables));
}

/**
 * Checks if two transaction instructions are identical by comparing their data, program IDs, and account keys.
 *
 * @param ix1 - First transaction instruction to compare
 * @param ix2 - Second transaction instruction to compare
 * @returns True if instructions are identical, false otherwise
 */
export function compareInstructions(ix1: TransactionInstruction, ix2: TransactionInstruction): boolean {
  const dataCompare = ix1.data.equals(ix2.data);
  const programIdCompare = ix1.programId.equals(ix2.programId);
  const keysCompare =
    ix1.keys.length === ix2.keys.length &&
    ix1.keys.every((key, index) => {
      const key2 = ix2.keys[index];
      return key.pubkey.equals(key2.pubkey) && key.isSigner === key2.isSigner && key.isWritable === key2.isWritable;
    });

  // Instructions are identical only if all components match
  return dataCompare && programIdCompare && keysCompare;
}

export function replaceV0TxInstructions(
  additionalInstructions: TransactionInstruction[],
  instructions: TransactionInstruction[],
  replaceOnly?: boolean
): TransactionInstruction[] {
  let updatedAdditionalIxs: TransactionInstruction[] = additionalInstructions;

  const updatedInstructions = instructions.map((ix) => {
    const programId = ix.programId;
    const additionalIxs = additionalInstructions.filter((a) => a.programId.equals(programId));

    if (additionalIxs.length > 0) {
      // TODO add bundle tip check
      if (ix.programId.equals(ComputeBudgetProgram.programId)) {
        const decoded = decodeComputeBudgetInstruction(ix);
        const updatedCuPriceIx = additionalIxs.find(
          (a) => decodeComputeBudgetInstruction(a).instructionType === "SetComputeUnitPrice"
        );

        const updatedCuLimitIx = additionalIxs.find(
          (a) => decodeComputeBudgetInstruction(a).instructionType === "SetComputeUnitLimit"
        );
        // replace priority fee instruction
        if (decoded.instructionType === "SetComputeUnitPrice" && updatedCuPriceIx) {
          //subtract the additional instruction from the additional instructions array
          updatedAdditionalIxs = updatedAdditionalIxs.filter((a) => !compareInstructions(a, updatedCuPriceIx));
          return updatedCuPriceIx;
        }

        // replace compute budget instruction
        if (decoded.instructionType === "SetComputeUnitLimit" && updatedCuLimitIx) {
          //subtract the additional instruction from the additional instructions array
          updatedAdditionalIxs = updatedAdditionalIxs.filter((a) => !compareInstructions(a, updatedCuLimitIx));
          return updatedCuLimitIx;
        }
      }
    }
    return ix;
  });

  return [...(replaceOnly ? [] : updatedAdditionalIxs), ...updatedInstructions];
}

export function replaceV0TxBlockhash(transaction: VersionedTransaction, blockhash: string): VersionedTransaction {
  let message = transaction.message;
  message.recentBlockhash = blockhash;
  return new VersionedTransaction(message);
}

/**
 * Enhances a given transaction with additional metadata.
 *
 * @param transaction - The transaction to be enhanced, can be either VersionedTransaction or Transaction.
 * @param options - An object containing optional metadata:
 *   - signers: An array of Signer objects that are associated with the transaction.
 *   - addressLookupTables: An array of AddressLookupTableAccount objects for address resolution.
 *   - unitsConsumed: A number representing the compute units consumed by the transaction.
 *   - type: The type of the transaction, as defined by TransactionType.
 * @returns A SolanaTransaction object that includes the original transaction and the additional metadata.
 */
export function addTransactionMetadata<T extends Transaction | VersionedTransaction>(
  transaction: T,
  options: ExtendedTransactionProperties
): T & ExtendedTransactionProperties {
  return Object.assign(transaction, options);
}

type ComputeBudgetInstructionType =
  | "RequestUnits"
  | "RequestHeapFrame"
  | "SetComputeUnitLimit"
  | "SetComputeUnitPrice"
  | "SetLoadedAccountsDataSizeLimit";

function identifyComputeBudgetInstruction(data: Buffer): ComputeBudgetInstructionType {
  const discriminator = data.readUInt8(0); // First byte identifies the instruction type

  switch (discriminator) {
    case 0:
      return "RequestUnits";
    case 1:
      return "RequestHeapFrame";
    case 2:
      return "SetComputeUnitLimit";
    case 3:
      return "SetComputeUnitPrice";
    case 4:
      return "SetLoadedAccountsDataSizeLimit";
    default:
      throw new Error("Unknown ComputeBudget instruction discriminator.");
  }
}

/**
 * Decodes a ComputeBudget program instruction into a readable format.
 *
 * @param instruction - The ComputeBudget program instruction to decode
 * @returns An object containing the decoded instruction data with fields depending on the instruction type:
 *   - RequestUnits: { instructionType: string, units: number, additionalFee: number }
 *   - RequestHeapFrame: { instructionType: string, bytes: number }
 *   - SetComputeUnitLimit: { instructionType: string, units: number }
 *   - SetComputeUnitPrice: { instructionType: string, microLamports: string }
 *   - SetLoadedAccountsDataSizeLimit: { instructionType: string, accountDataSizeLimit: number }
 * @throws Error if the instruction data is invalid or the instruction type is unknown
 */
export function decodeComputeBudgetInstruction(instruction: TransactionInstruction) {
  const data = Buffer.from(instruction.data || instruction);
  const instructionType = identifyComputeBudgetInstruction(data);
  switch (instructionType) {
    case "RequestUnits": {
      if (data.length !== 9) {
        throw new Error("Invalid data length for RequestUnits");
      }
      const units = data.readUInt32LE(1);
      const additionalFee = data.readUInt32LE(5);
      return { instructionType, units, additionalFee };
    }
    case "RequestHeapFrame": {
      if (data.length !== 5) {
        throw new Error("Invalid data length for RequestHeapFrame");
      }
      const bytes = data.readUInt32LE(1);
      return { instructionType, bytes };
    }
    case "SetComputeUnitLimit": {
      if (data.length !== 5) {
        throw new Error("Invalid data length for SetComputeUnitLimit");
      }
      const units = data.readUInt32LE(1);
      return { instructionType, units };
    }
    case "SetComputeUnitPrice": {
      if (data.length !== 9) {
        throw new Error("Invalid data length for SetComputeUnitPrice");
      }
      const microLamports = data.readBigUInt64LE(1);
      return { instructionType, microLamports: microLamports.toString() };
    }
    case "SetLoadedAccountsDataSizeLimit": {
      if (data.length !== 5) {
        throw new Error("Invalid data length for SetLoadedAccountsDataSizeLimit");
      }
      const accountDataSizeLimit = data.readUInt32LE(1);
      return { instructionType, accountDataSizeLimit };
    }
    default:
      throw new Error("Unknown ComputeBudget instruction type.");
  }
}

const DEFAULT_COMPUTE_BUDGET_IX = 200_000;

export function getComputeBudgetUnits(tx: SolanaTransaction): number | undefined {
  let instructions: TransactionInstruction[] = [];

  if (isV0Tx(tx)) {
    const addressLookupTableAccounts = tx.addressLookupTables ?? [];
    const message = decompileV0Transaction(tx, addressLookupTableAccounts);
    instructions = message.instructions;
  } else {
    instructions = tx.instructions;
  }

  const computeBudgetIxs = instructions.filter((ix) => ix.programId.equals(ComputeBudgetProgram.programId));

  if (computeBudgetIxs.length === 0) {
    return Math.min(instructions.length * DEFAULT_COMPUTE_BUDGET_IX, 1_400_000);
  }

  const decoded = computeBudgetIxs.map((ix) => decodeComputeBudgetInstruction(ix));
  const limit = decoded.find((ix) => ix.instructionType === "SetComputeUnitLimit");

  return limit?.units ?? instructions.length * DEFAULT_COMPUTE_BUDGET_IX;
}

/**
 * Converts a priority fee from UI units (SOL) to micro-lamports per compute unit
 * @param ui - Priority fee amount in SOL
 * @param limitCU - Compute unit limit, defaults to 1.4M CU
 * @returns Priority fee in micro-lamports per compute unit
 */
export const uiToMicroLamports = (ui: number, limitCU: number = 1_400_000) => {
  const priorityFeeMicroLamports = ui * LAMPORTS_PER_SOL * 1_000_000;
  return priorityFeeMicroLamports / limitCU;
};

/**
 * Converts a priority fee from micro-lamports per compute unit to UI units (SOL)
 * @param microLamports - Priority fee in micro-lamports per compute unit
 * @param limitCU - Compute unit limit, defaults to 1.4M CU
 * @returns Priority fee amount in SOL, truncated to 9 decimal places
 */
export const microLamportsToUi = (microLamports: number, limitCU: number = 1_400_000) => {
  const priorityFeeMicroLamports = microLamports * limitCU;
  const priorityFeeUi = priorityFeeMicroLamports / (LAMPORTS_PER_SOL * 1_000_000);
  return Math.trunc(priorityFeeUi * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL;
};
