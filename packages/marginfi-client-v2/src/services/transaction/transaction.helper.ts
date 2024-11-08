import {
  isV0Tx,
  decompileV0Transaction,
  decodeInstruction,
  TransactionBroadcastType,
  getTxSize,
  legacyTxToV0Tx,
  updateV0Tx,
  sleep,
  SolanaTransaction,
  // PRIORITY_TX_SIZE,
  // BUNDLE_TX_SIZE,
  // MAX_TX_SIZE,
} from "@mrgnlabs/mrgn-common";
import { PublicKey, VersionedTransaction, TransactionInstruction } from "@solana/web3.js";
import { MARGINFI_IDL, MarginfiIdlType } from "../../idl";
import { makeTxPriorityIx } from "../../models/account";

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

// TODO: add bundle tip tx if fails, measure the size
export function formatTransactions(
  transactions: SolanaTransaction[],
  broadcastType: TransactionBroadcastType,
  priorityFeeUi: number,
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

  const { bundleTipIx, priorityFeeIx } = makeTxPriorityIx(feePayer, priorityFeeUi, broadcastType);

  let bundleTipIndex = broadcastType === "BUNDLE" ? -1 : null; // if index is -1 in the end, then add bundle tx
  const priorityFeeIndexes: number[] = [];

  // check if the tx is a flashloan

  for (let i = 0; i < txSizes.length; i++) {
    if (flashloanIndex !== i) {
      let baseTxSize = txSizes[i];

      if (bundleTipIndex === -1 && txSizes[i] + BUNDLE_TX_SIZE < MAX_TX_SIZE) {
        baseTxSize += BUNDLE_TX_SIZE;
        bundleTipIndex = i;
      }

      if (baseTxSize + PRIORITY_TX_SIZE < MAX_TX_SIZE) {
        priorityFeeIndexes.push(i);
      }
    }
  }

  for (const [index, transaction] of transactions.entries()) {
    const hasFlashloan = !!flashloanIndex; // check if there is a flashloan
    const isTxFlashloan = hasFlashloan && flashloanIndex === index; // check if the tx is the flashloan tx

    const signers = transaction.signers ?? [];
    const addressLookupTables = transaction.addressLookupTables ?? [];

    if (isTxFlashloan) {
      if (isV0Tx(transaction)) {
        formattedTransactions.push(transaction);
      } else {
        formattedTransactions.push(legacyTxToV0Tx(transaction, { blockhash, addressLookupTables }));
      }
      continue;
    }
    const requiredIxs: TransactionInstruction[] = [
      ...(bundleTipIndex === index && bundleTipIx ? [bundleTipIx] : []),
      ...(priorityFeeIndexes.includes(index) ? [priorityFeeIx] : []),
    ];

    let newTransaction: VersionedTransaction;

    if (isV0Tx(transaction)) {
      newTransaction = updateV0Tx(transaction, {
        addressLookupTables,
        additionalIxs: requiredIxs,
        blockhash,
      });
    } else {
      newTransaction = legacyTxToV0Tx(transaction, {
        addressLookupTables,
        additionalIxs: requiredIxs,
        blockhash,
      });
    }

    newTransaction.sign(signers);
    formattedTransactions.push(newTransaction);
  }

  return formattedTransactions;
}

export async function sendTransactionAsBundle(base58Txs: string[]): Promise<string[]> {
  try {
    const sendBundleResponse = await fetch("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [base58Txs],
      }),
    });

    const sendBundleResult = await sendBundleResponse.json();
    if (sendBundleResult.error) throw new Error(sendBundleResult.error.message);

    const bundleId = sendBundleResult.result;

    await sleep(500);

    for (let attempt = 0; attempt < 10; attempt++) {
      const getBundleStatusInFlightResponse = await fetch("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getInflightBundleStatuses",
          params: [[bundleId]],
        }),
      });

      const getBundleStatusInFlightResult = await getBundleStatusInFlightResponse.json();

      if (getBundleStatusInFlightResult.error) throw new Error(getBundleStatusInFlightResult.error.message);

      const status = getBundleStatusInFlightResult?.result?.value[0]?.status;

      /**
       * Bundle status values:
       * - Failed: All regions marked bundle as failed, not forwarded
       * - Pending: Bundle has not failed, landed, or been deemed invalid
       * - Landed: Bundle successfully landed on-chain (verified via RPC/bundles_landed table)
       * - Invalid: Bundle is no longer in the system
       */
      if (status === "Failed") {
        throw new Error("Bundle failed");
      } else if (status === "Landed") {
        break;
      }

      await sleep(500); // Wait before retrying
    }

    const getBundleStatusResponse = await fetch("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBundleStatuses",
        params: [[bundleId]],
      }),
    });

    const getBundleStatusResult = await getBundleStatusResponse.json();

    if (getBundleStatusResult.error) throw new Error(getBundleStatusResult.error.message);

    const signature = getBundleStatusResult?.result?.value[0]?.transactions;

    if (signature) {
      return signature;
    }
  } catch (error) {
    console.error(error);
  }

  throw new Error("Bundle failed");
}
