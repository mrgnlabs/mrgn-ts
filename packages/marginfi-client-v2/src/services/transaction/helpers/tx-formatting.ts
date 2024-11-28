import {
  PublicKey,
  VersionedTransaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  TransactionMessage,
} from "@solana/web3.js";
import {
  isV0Tx,
  decompileV0Transaction,
  decodeInstruction,
  TransactionBroadcastType,
  getTxSize,
  legacyTxToV0Tx,
  updateV0Tx,
  SolanaTransaction,
  getComputeBudgetUnits,
  microLamportsToUi,
  uiToMicroLamports,
} from "@mrgnlabs/mrgn-common";

import { MARGINFI_IDL, MarginfiIdlType } from "../../../idl";
import { makeTxPriorityIx } from "../../../models/account";
import { makePriorityFeeMicroIx } from "../../../utils";

// Temporary imports
export const MAX_TX_SIZE = 1232;
export const BUNDLE_TX_SIZE = 81;
export const PRIORITY_TX_SIZE = 44;

export function isFlashloan(tx: SolanaTransaction): boolean {
  if (isV0Tx(tx)) {
    const addressLookupTableAccounts = tx.addressLookupTables ?? [];
    const message = decompileV0Transaction(tx, addressLookupTableAccounts);
    const idl = { ...MARGINFI_IDL, address: new PublicKey(0) } as unknown as MarginfiIdlType;
    const decoded = message.instructions.map((ix) => decodeInstruction(idl, ix.data));
    return decoded.some((ix) => ix?.name.toLowerCase().includes("flashloan"));
  }
  //TODO: add legacy tx check
  return false;
}

export function hasBundleTip(tx: SolanaTransaction): boolean {
  if (isV0Tx(tx)) {
    const addressLookupTableAccounts = tx.addressLookupTables ?? [];
    const message = decompileV0Transaction(tx, addressLookupTableAccounts);
    const idl = { ...MARGINFI_IDL, address: new PublicKey(0) } as unknown as MarginfiIdlType;
    const decoded = message.instructions.map((ix) => decodeInstruction(idl, ix.data));
    return decoded.some((ix) => ix?.name.toLowerCase().includes("flashloan"));
  }
  return false;
}

function getFlashloanIndex(transactions: SolanaTransaction[]): number | null {
  for (const [index, transaction] of transactions.entries()) {
    if (isFlashloan(transaction)) {
      return index;
    }
  }
  return null;
}

export function formatTransactions(
  transactions: SolanaTransaction[],
  broadcastType: TransactionBroadcastType,
  priorityFeeMicro: number,
  bundleTipUi: number,
  feePayer: PublicKey,
  blockhash: string
): VersionedTransaction[] {
  let formattedTransactions: VersionedTransaction[] = [];

  const flashloanIndex = getFlashloanIndex(transactions);
  transactions.forEach((tx) => {
    if (!isV0Tx(tx)) {
      tx.recentBlockhash = blockhash;
      tx.feePayer = feePayer;
    }
  });

  const txSizes: number[] = transactions.map((tx) => getTxSize(tx));
  const dummyPriorityFeeIx = makePriorityFeeMicroIx(1);

  const priorityIxs: TransactionInstruction[] = [];
  const cuLimitIxs: (TransactionInstruction | undefined)[] = [];

  transactions.forEach((tx, idx) => {
    const cu = tx.unitsConsumed ? Math.min(tx.unitsConsumed + 50_000, 1_400_000) : getComputeBudgetUnits(tx);
    const priorityFeeUi = microLamportsToUi(priorityFeeMicro, cu);

    let updatedFees = priorityFeeMicro;
    // don't want to pay more than 0.008 SOL in fees
    if (priorityFeeUi > 0.008) {
      updatedFees = uiToMicroLamports(0.008, cu);
    }

    priorityIxs.push(broadcastType === "BUNDLE" ? dummyPriorityFeeIx : makePriorityFeeMicroIx(updatedFees, cu));
    cuLimitIxs.push(cu ? ComputeBudgetProgram.setComputeUnitLimit({ units: cu }) : undefined);
  });

  const { bundleTipIx } = makeTxPriorityIx(feePayer, bundleTipUi, broadcastType);

  let bundleTipIndex = broadcastType === "BUNDLE" ? -1 : null; // if index is -1 in the end, then add bundle tx
  const priorityFeeIndexes: number[] = [];

  for (let i = 0; i < txSizes.length; i++) {
    let baseTxSize = txSizes[i];

    if (flashloanIndex !== i) {
      if (bundleTipIndex === -1 && txSizes[i] + BUNDLE_TX_SIZE < MAX_TX_SIZE) {
        baseTxSize += BUNDLE_TX_SIZE;
        bundleTipIndex = i;
      }
    }

    if (flashloanIndex === i || baseTxSize + PRIORITY_TX_SIZE < MAX_TX_SIZE) {
      priorityFeeIndexes.push(i);
    }
  }

  // no space for bundle tip, so add seperate tx
  if (bundleTipIndex === -1 && bundleTipIx) {
    const bundleTipMessage = new TransactionMessage({
      instructions: [bundleTipIx],
      payerKey: feePayer,
      recentBlockhash: blockhash,
    });

    formattedTransactions.push(new VersionedTransaction(bundleTipMessage.compileToV0Message()));
  }

  for (const [index, transaction] of transactions.entries()) {
    const hasFlashloan = flashloanIndex !== null; // check if there is a flashloan
    const isTxFlashloan = hasFlashloan && flashloanIndex === index; // check if the tx is the flashloan tx

    const signers = transaction.signers ?? [];
    const addressLookupTables = transaction.addressLookupTables ?? [];

    const requiredIxs: TransactionInstruction[] = [
      ...(bundleTipIndex === index && bundleTipIx ? [bundleTipIx] : []),
      ...(priorityFeeIndexes.includes(index) ? [priorityIxs[index]] : []),
      ...(cuLimitIxs[index] ? [cuLimitIxs[index]] : []),
    ];

    let newTransaction: VersionedTransaction;

    if (isV0Tx(transaction)) {
      newTransaction = updateV0Tx(transaction, {
        addressLookupTables,
        additionalIxs: requiredIxs,
        blockhash,
        replaceOnly: isTxFlashloan,
      });
    } else {
      newTransaction = legacyTxToV0Tx(transaction, {
        addressLookupTables,
        additionalIxs: requiredIxs,
        blockhash,
        replaceOnly: isTxFlashloan,
      });
    }

    newTransaction.sign(signers);
    formattedTransactions.push(newTransaction);
  }

  return formattedTransactions;
}
