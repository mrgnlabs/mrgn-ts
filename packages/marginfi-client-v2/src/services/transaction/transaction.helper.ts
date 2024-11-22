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
  TransactionOptions,
  decodeComputeBudgetInstruction,
  getComputeBudgetUnits,
  // PRIORITY_TX_SIZE,
  // BUNDLE_TX_SIZE,
  // MAX_TX_SIZE,
} from "@mrgnlabs/mrgn-common";
import {
  PublicKey,
  VersionedTransaction,
  TransactionInstruction,
  TransactionSignature,
  Connection,
  TransactionConfirmationStrategy,
  Commitment,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { MARGINFI_IDL, MarginfiIdlType } from "../../idl";
import { makeTxPriorityIx } from "../../models/account";
import { SystemProgram } from "@solana/web3.js";
import { makePriorityFeeMicroIx } from "../../utils";
import { confirmTransaction } from "./transaction.service";

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

const uiToMicroLamports = (ui: number, limitCU: number = 1_400_000) => {
  const priorityFeeMicroLamports = ui * LAMPORTS_PER_SOL * 1_000_000;
  return priorityFeeMicroLamports / limitCU;
};

const microLamportsToUi = (microLamports: number, limitCU: number = 1_400_000) => {
  const priorityFeeMicroLamports = microLamports * limitCU;
  const priorityFeeUi = priorityFeeMicroLamports / (LAMPORTS_PER_SOL * 1_000_000);
  return Math.trunc(priorityFeeUi * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL;
};

// TODO: add bundle tip tx if fails, measure the size
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

type SendTransactionAsRpcProps = {
  versionedTransactions: VersionedTransaction[];
  connection: Connection;
  blockStrategy: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
  isSequentialTxs: boolean;
  confirmCommitment?: Commitment;
  txOpts?: TransactionOptions;
  throwError?: boolean;
  onCallback?: (index: number, success: boolean, sig: string) => void;
};

export async function sendTransactionAsBundleRpc({
  versionedTransactions,
  txOpts,
  connection,
  onCallback,
  blockStrategy,
  confirmCommitment,
  isSequentialTxs,
  throwError = false,
}: SendTransactionAsRpcProps): Promise<TransactionSignature[]> {
  let signatures: TransactionSignature[] = [];
  if (isSequentialTxs) {
    for (const [index, tx] of versionedTransactions.entries()) {
      const signature = await connection.sendTransaction(tx, txOpts);

      try {
        await confirmTransaction(connection, signature, confirmCommitment);
        onCallback?.(index, true, signature);
      } catch (error) {
        onCallback?.(index, false, signature);
        throw error;
      }
      signatures.push(signature);
    }
  } else {
    signatures = await Promise.all(
      versionedTransactions.map(async (versionedTransaction) => {
        const signature = await connection.sendTransaction(versionedTransaction, txOpts);
        return signature;
      })
    );

    await Promise.all(
      signatures.map(async (signature, index) => {
        try {
          const result = await confirmTransaction(connection, signature, confirmCommitment);
          onCallback?.(index, true, signature);
          return result;
        } catch (error) {
          onCallback?.(index, false, signature);
          throw error;
        }
      })
    );
  }

  return signatures;
}

export class GrpcBundleError extends Error {
  public readonly bundleId: string;

  constructor(message: string, bundleId: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
    this.bundleId = bundleId;

    Error.captureStackTrace(this, this.constructor);
  }
}

export async function sendTransactionAsGrpcBundle(
  base58Txs: string[],
  throwError = false
): Promise<string | undefined> {
  try {
    const sendBundleResponse = await fetch("/api/bundles/sendBundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactions: base58Txs,
      }),
    });

    const sendBundleResult = await sendBundleResponse.json();
    if (sendBundleResult.error) throw new GrpcBundleError(sendBundleResult.error.message, sendBundleResult?.bundleId);
    const bundleId = sendBundleResult.bundleId;

    console.log("bundleId:", bundleId);

    return bundleId;
  } catch (error) {
    console.log("GRCP BUNDLE FAILED");

    if (error instanceof GrpcBundleError) {
      throw error;
    }

    if (throwError) throw new Error("Bundle failed");
  }
}

export async function sendTransactionAsBundle(
  base58Txs: string[],
  throwError = false,
  tempBundleId?: string
): Promise<string | undefined> {
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
    if (sendBundleResult.error) {
      if (sendBundleResult.error.message.includes("already processed")) {
        return tempBundleId ?? "0x0"; // todo add proper bundle id
      }

      throw new Error(sendBundleResult.error.message);
    }

    const bundleId = sendBundleResult.result as string;
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
        return bundleId;
      }

      await sleep(500); // Wait before retrying
    }
  } catch (error) {
    console.log("API BUNDLE FAILED");
    if (throwError) throw new Error("Bundle failed");
  }

  if (throwError) throw new Error("Bundle failed");
}
