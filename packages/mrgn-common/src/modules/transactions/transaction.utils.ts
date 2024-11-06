import { BorshInstructionCoder, Idl, Instruction } from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { SolanaTransaction } from "./transaction.types";

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

  const baseTxSize = isVersioned
    ? tx.serialize().length
    : tx.serialize({ requireAllSignatures: false, verifySignatures: false }).length;

  return baseTxSize + feePayerSize + signaturesSize;
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

  const message = decompileV0Transaction(transaction, addressLookupTables);
  const feePayer = opts?.feePayer ?? message.payerKey;
  const blockhash = opts?.blockhash ?? message.recentBlockhash;

  const versionedMessage = new TransactionMessage({
    instructions: [...additionalIxs, ...message.instructions],
    payerKey: feePayer,
    recentBlockhash: blockhash,
  });
  return new VersionedTransaction(versionedMessage.compileToV0Message(addressLookupTables));
}

/**
 * Enhances a given transaction with additional metadata.
 *
 * @param transaction - The transaction to be enhanced, can be either VersionedTransaction or Transaction.
 * @param options - An object containing optional metadata:
 *   - signers: An array of Signer objects that are associated with the transaction.
 *   - addressLookupTables: An array of AddressLookupTableAccount objects for address resolution.
 * @returns A SolanaTransaction object that includes the original transaction and the additional metadata.
 */
export function addTransactionMetadata(
  transaction: VersionedTransaction | Transaction,
  options: { signers?: Array<Signer>; addressLookupTables?: AddressLookupTableAccount[] }
): SolanaTransaction {
  return {
    ...transaction,
    ...options,
  } as SolanaTransaction;
}
