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
  MARGINFI_PROGRAM,
  addTransactionMetadata,
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

function getFlashloanIndex(transactions: SolanaTransaction[]): number | null {
  for (const [index, transaction] of transactions.entries()) {
    if (isFlashloan(transaction)) {
      return index;
    }
  }
  return null;
}

export function formatTransactions(
  transactionsArg: SolanaTransaction[],
  broadcastType: TransactionBroadcastType,
  priorityFeeMicro: number,
  bundleTipUi: number,
  feePayer: PublicKey,
  blockhash: string,
  maxCapUi?: number,
  addArenaTxTag?: boolean
): VersionedTransaction[] {
  let formattedTransactions: VersionedTransaction[] = [];

  const flashloanIndex = getFlashloanIndex(transactionsArg);
  transactionsArg.forEach((tx) => {
    if (!isV0Tx(tx)) {
      tx.recentBlockhash = blockhash;
      tx.feePayer = feePayer;
    }
  });

  let transactions = addArenaTxTag ? addArenaTxTags(transactionsArg) : transactionsArg;

  const txSizes: number[] = transactions.map((tx) => getTxSize(tx));
  const dummyPriorityFeeIx = makePriorityFeeMicroIx(1);

  const priorityIxs: TransactionInstruction[] = [];
  const cuLimitIxs: (TransactionInstruction | undefined)[] = [];

  transactions.forEach((tx, idx) => {
    const cu = tx.unitsConsumed ? Math.min(tx.unitsConsumed + 50_000, 1_400_000) : getComputeBudgetUnits(tx);
    const priorityFeeUi = maxCapUi
      ? Math.min(microLamportsToUi(priorityFeeMicro, cu), maxCapUi)
      : microLamportsToUi(priorityFeeMicro, cu);

    let updatedFees = uiToMicroLamports(priorityFeeUi, cu);
    // don't want to pay more than 0.1 SOL in fees
    if (priorityFeeUi > 0.1) {
      updatedFees = uiToMicroLamports(0.1, cu);
    }

    priorityIxs.push(broadcastType === "BUNDLE" ? dummyPriorityFeeIx : makePriorityFeeMicroIx(updatedFees));
    cuLimitIxs.push(cu ? ComputeBudgetProgram.setComputeUnitLimit({ units: cu }) : undefined);
  });

  const { bundleTipIx } = makeTxPriorityIx(
    feePayer,
    maxCapUi ? Math.min(bundleTipUi, maxCapUi) : bundleTipUi,
    broadcastType
  );

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

function addArenaTxTags(transactions: SolanaTransaction[]): SolanaTransaction[] {
  const txWithTags: SolanaTransaction[] = [];

  for (const [index, tx] of transactions.entries()) {
    if (isV0Tx(tx)) {
      const addressLookupTableAccounts = tx.addressLookupTables ?? [];
      const message = decompileV0Transaction(tx, addressLookupTableAccounts);
      const hasMarginfiIx = !!message.instructions.find((ix) => ix.programId.equals(MARGINFI_PROGRAM));
      // const isMainMfiGroup = message.instructions.some((ix) =>
      //   ix.keys.some((key) => key.pubkey.equals(new PublicKey("4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8")))
      // );
      if (hasMarginfiIx) {
        message.instructions[0].keys.push({
          pubkey: new PublicKey("ArenaGxeqvXoEzVtwpZR3rdyNVNJb374nabxLwDdHWLW"),
          isSigner: false,
          isWritable: false,
        });
        const updatedTx = addTransactionMetadata(
          new VersionedTransaction(message.compileToV0Message(tx.addressLookupTables)),
          {
            addressLookupTables: tx.addressLookupTables,
            signers: tx.signers,
            unitsConsumed: tx.unitsConsumed,
            type: tx.type,
          }
        );
        txWithTags.push(updatedTx);
      } else {
        txWithTags.push(tx);
      }
    } else {
      const hasMarginfiIx = tx.instructions.some((ix) => ix.programId.equals(MARGINFI_PROGRAM));
      if (hasMarginfiIx) {
        tx.instructions[0].keys.push({
          pubkey: new PublicKey("ArenaGxeqvXoEzVtwpZR3rdyNVNJb374nabxLwDdHWLW"),
          isSigner: false,
          isWritable: false,
        });
        txWithTags.push(tx);
      } else {
        txWithTags.push(tx);
      }
    }
  }
  return txWithTags;
}
