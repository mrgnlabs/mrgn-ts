import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  TransactionOptions,
  TransactionBroadcastType,
  simulateBundle,
  DEFAULT_CONFIRM_OPTS,
  Wallet,
  SolanaTransaction,
  sleep,
  setTimeoutPromise,
  legacyTxToV0Tx,
  isV0Tx,
  addTransactionMetadata,
} from "@mrgnlabs/mrgn-common";
import {
  VersionedTransaction,
  TransactionSignature,
  Connection,
  SendTransactionError,
  ConfirmOptions,
  PublicKey,
  Commitment,
} from "@solana/web3.js";

import { parseTransactionError, ProcessTransactionError, ProcessTransactionErrorType } from "../../errors";
import {
  formatTransactions,
  GrpcBundleError,
  sendTransactionAsBundle,
  sendTransactionAsBundleRpc,
  sendTransactionAsGrpcBundle,
} from "./transaction.helper";

// TEMPORARY
export const MARGINFI_PROGRAM = new PublicKey("MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA");

export const DEFAULT_PROCESS_TX_OPTS = {
  broadcastType: "BUNDLE" as TransactionBroadcastType,
  isSequentialTxs: true,
  isReadOnly: false,
};
export interface ProcessTransactionOpts extends ProcessTransactionsClientOpts {
  isReadOnly?: boolean;
  programId?: PublicKey;
  bundleSimRpcEndpoint?: string;
}

export type PriorityFees = {
  bundleTipUi?: number;
  priorityFeeMicro?: number;
};

type BroadcastMethodType = Extract<TransactionBroadcastType, "BUNDLE" | "RPC">;

export type SpecificBroadcastMethodType = "GRPC_BUNDLE" | "API_BUNDLE" | "RPC_BUNDLE" | "RPC_SEQUENTIAL";

export type SpecificBroadcastMethod = {
  method: SpecificBroadcastMethodType;
  broadcastType: BroadcastMethodType;
};

export type ProcessTransactionStrategy = {
  splitExecutionsStrategy?: {
    singleTx: BroadcastMethodType;
    multiTx: BroadcastMethodType;
  };
  fallbackSequence: SpecificBroadcastMethod[];
};

export const DEFAULT_PROCESS_TX_STRATEGY: ProcessTransactionStrategy = {
  splitExecutionsStrategy: {
    singleTx: "RPC",
    multiTx: "BUNDLE",
  },
  // if splitExecutionsStrategy is provided, the fallbackSequence will prioritize the first relevant broadcast method in the array
  fallbackSequence: [
    { method: "GRPC_BUNDLE", broadcastType: "BUNDLE" },
    { method: "API_BUNDLE", broadcastType: "BUNDLE" },
    { method: "RPC_BUNDLE", broadcastType: "RPC" },
    { method: "RPC_SEQUENTIAL", broadcastType: "RPC" },
  ],
};

export interface ProcessTransactionsClientOpts extends PriorityFees {
  broadcastType?: TransactionBroadcastType;
  dynamicStrategy?: ProcessTransactionStrategy;
  isSequentialTxs?: boolean;
  callback?: (index: number, success: boolean, signature?: string) => void;
}

type ProcessTransactionsProps = {
  transactions: SolanaTransaction[];
  connection: Connection;
  wallet: Wallet;
  txOpts?: TransactionOptions;
  processOpts?: ProcessTransactionOpts;
};

/**
 * Processes a batch of Solana transactions by signing, simulating, and sending them to the network.
 *
 * @param {ProcessTransactionsProps} props - The properties required to process transactions.
 * @param {SolanaTransaction[]} props.transactions - The transactions to be processed.
 * @param {Connection} props.connection - The connection to the Solana network.
 * @param {Wallet} props.wallet - The wallet used to sign the transactions.
 * @param {ProcessTransactionOpts} [props.processOpts] - Optional processing options.
 * @param {TransactionOptions} [props.txOpts] - Optional transaction options.
 *
 * @returns {Promise<TransactionSignature[]>} - A promise that resolves to an array of transaction signatures.
 *
 * @throws {ProcessTransactionError} - Throws an error if transaction processing fails.
 */
export async function processTransactions({
  transactions,
  connection,
  wallet,
  processOpts: processOptsArgs,
  txOpts,
}: ProcessTransactionsProps): Promise<TransactionSignature[]> {
  const processOpts = {
    ...DEFAULT_PROCESS_TX_OPTS,
    ...processOptsArgs,
  };
  const commitment = connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment;

  console.log("processOpts", processOpts);

  if (processOpts?.broadcastType === "BUNDLE" && processOpts?.bundleTipUi === 0) {
    throw new Error("A bundle tip is required for a bundled transactions");
  }

  let broadcastType: BroadcastMethodType;
  let finalFallbackMethod: SpecificBroadcastMethod[];

  const strategy = processOpts.dynamicStrategy ?? DEFAULT_PROCESS_TX_STRATEGY;
  if (processOpts?.broadcastType === "DYNAMIC") {
    if (strategy.splitExecutionsStrategy) {
      if (transactions.length > 1) {
        broadcastType = strategy.splitExecutionsStrategy.multiTx;
      } else {
        broadcastType = strategy.splitExecutionsStrategy.singleTx;
      }
    } else {
      broadcastType = strategy.fallbackSequence[0].broadcastType;
    }
  } else {
    broadcastType = processOpts.broadcastType;
  }

  if (broadcastType === "RPC") {
    finalFallbackMethod = strategy.fallbackSequence.filter((method) => method.broadcastType === "RPC");
  } else {
    finalFallbackMethod = strategy.fallbackSequence.filter((method) => method.broadcastType === "BUNDLE");
  }

  console.log("decided broadcast type:", broadcastType);
  console.log("decided fallback methods:", finalFallbackMethod);

  let versionedTransactions: VersionedTransaction[] = [];
  let minContextSlot: number;
  let blockhash: string;
  let lastValidBlockHeight: number;

  try {
    const getLatestBlockhashAndContext = await connection.getLatestBlockhashAndContext(commitment);

    minContextSlot = getLatestBlockhashAndContext.context.slot - 4;
    blockhash = getLatestBlockhashAndContext.value.blockhash;
    lastValidBlockHeight = getLatestBlockhashAndContext.value.lastValidBlockHeight;
  } catch (error) {
    throw new Error("Failed to get latest blockhash and context");
  }

  let mergedOpts: ConfirmOptions = {
    ...DEFAULT_CONFIRM_OPTS,
    commitment,
    preflightCommitment: commitment,
    minContextSlot,
    ...txOpts,
  };

  try {
    const unitsConsumed = await simulateTransactions(processOpts, connection, transactions, mergedOpts, {
      feePayer: wallet.publicKey,
      blockhash,
    });

    const updatedTransactions = transactions.map((tx, idx) =>
      addTransactionMetadata(tx, {
        ...tx,
        unitsConsumed: unitsConsumed[idx],
      })
    );

    versionedTransactions = formatTransactions(
      updatedTransactions,
      broadcastType,
      processOpts.priorityFeeMicro ?? 0,
      processOpts.bundleTipUi ?? 0,
      wallet.publicKey,
      blockhash
    );

    if (versionedTransactions.length === 0) throw new Error();
  } catch (error: any) {
    console.log("Failed to build the transaction", error);
    throw new ProcessTransactionError(error.message, ProcessTransactionErrorType.TransactionBuildingError);
  }

  try {
    if (txOpts?.dryRun || processOpts?.isReadOnly) {
      return await dryRunTransaction(processOpts, connection, versionedTransactions);
    } else {
      let base58Txs: string[] = [];

      if (!!wallet.signAllTransactions) {
        versionedTransactions = await wallet.signAllTransactions(versionedTransactions);
        base58Txs = versionedTransactions.map((signedTx) => bs58.encode(signedTx.serialize()));
      } else {
        for (let i = 0; i < versionedTransactions.length; i++) {
          const signedTx = await wallet.signTransaction(versionedTransactions[i]);
          const base58Tx = bs58.encode(signedTx.serialize());
          base58Txs.push(base58Tx);
          versionedTransactions[i] = signedTx;
        }
      }

      const simulateTxs = async () =>
        await simulateTransactions(processOpts, connection, versionedTransactions, mergedOpts);
      const sendTxBundleGrpc = async (isLast: boolean) => await sendTransactionAsGrpcBundle(base58Txs, isLast);
      const sendTxBundleApi = async (isLast: boolean, bundleId?: string) =>
        await sendTransactionAsBundle(base58Txs, isLast, bundleId);
      const sendTxBundleRpc = async () =>
        await sendTransactionAsBundleRpc({
          versionedTransactions,
          txOpts,
          connection,
          onCallback: processOpts.callback,
          blockStrategy: { blockhash, lastValidBlockHeight },
          confirmCommitment: mergedOpts.commitment,
          isSequentialTxs: processOpts.isSequentialTxs,
          throwError: true,
        });

      let signatures: TransactionSignature[] = [];
      let bundleSignature: string | undefined;

      for (const [idx, method] of finalFallbackMethod.entries()) {
        const isLast = idx === finalFallbackMethod.length - 1;
        if (idx === 0) {
          await simulateTxs();
        }

        let temporaryBundleSignature: string | undefined;
        let sig: string | undefined;
        let sigs: string[] | undefined;
        switch (method.method) {
          case "GRPC_BUNDLE":
            sig = await sendTxBundleGrpc(isLast).catch((error) => {
              if (error instanceof GrpcBundleError) {
                temporaryBundleSignature = error.bundleId;
              } else {
                throw error;
              }
              return undefined;
            });
            if (sig) bundleSignature = sig;
            break;
          case "API_BUNDLE":
            sig = await sendTxBundleApi(isLast, temporaryBundleSignature);
            if (sig) bundleSignature = sig;
            break;
          case "RPC_BUNDLE":
            sigs = await sendTxBundleRpc();
            if (sigs) signatures = sigs;
            break;
          case "RPC_SEQUENTIAL":
            console.log("implement");
            break;
        }

        if (sig || sigs) {
          break;
        }
      }

      console.log("bundleSignatures:", bundleSignature);
      console.log("signatures:", signatures);

      if (signatures.length !== 0) {
        // await Promise.all(
        //   signatures.map(async (signature) => {
        //     await connection.confirmTransaction(
        //       {
        //         blockhash,
        //         lastValidBlockHeight,
        //         signature,
        //       },
        //       mergedOpts.commitment
        //     );
        //   })
        // );
        return signatures;
      } else {
        if (!bundleSignature) throw new Error("Transactions failed to land");
        return [bundleSignature];
      }
    }
  } catch (error: any) {
    const parsedError = parseTransactionError(error, processOpts?.programId ?? MARGINFI_PROGRAM);

    if (error?.logs?.length > 0) {
      console.log("------ Logs 👇 ------");
      console.log(error.logs.join("\n"));
      if (parsedError) {
        console.log("Parsed:", parsedError);
        throw new ProcessTransactionError(
          parsedError.description,
          ProcessTransactionErrorType.SimulationError,
          error.logs,
          parsedError.programId
        );
      }
    }
    console.log("fallthrough error", error);
    throw new ProcessTransactionError(
      parsedError?.description ?? "Something went wrong",
      ProcessTransactionErrorType.SimulationError,
      error.logs,
      parsedError.programId
    );
  }
}

const simulateTransactions = async (
  processOpts: ProcessTransactionOpts,
  connection: Connection,
  solanaTransactions: SolanaTransaction[],
  confirmOpts?: ConfirmOptions,
  txOpts?: {
    feePayer: PublicKey;
    blockhash: string;
  }
): Promise<(number | undefined)[]> => {
  const v0Txs = solanaTransactions.map((tx) => (isV0Tx(tx) ? tx : legacyTxToV0Tx(tx, txOpts)));
  if (v0Txs.length > 1) {
    const response = await simulateBundle(processOpts?.bundleSimRpcEndpoint ?? connection.rpcEndpoint, v0Txs).catch(
      (error) => {
        throw new SendTransactionError({
          action: "simulate",
          signature: "",
          transactionMessage: JSON.stringify(error),
          logs: [],
        });
      }
    );

    const value = response.result.value;

    const err = value.summary !== "succeeded" ? JSON.stringify(value.summary.failed.error) : null;
    const logs = value.transactionResults.flatMap((tx) => tx.logs);
    const unitsConsumed = value.transactionResults.map((tx) =>
      tx.unitsConsumed ? Number.parseInt(tx.unitsConsumed) : undefined
    );

    if (err) {
      throw new SendTransactionError({
        action: "simulate",
        signature: "",
        transactionMessage: JSON.stringify(err),
        logs: logs ?? [],
      });
    }
    return unitsConsumed ? unitsConsumed : [];
  } else {
    const response = await connection.simulateTransaction(v0Txs[0], {
      sigVerify: false,
      commitment: confirmOpts?.commitment,
      replaceRecentBlockhash: false,
      minContextSlot: confirmOpts?.minContextSlot,
    });
    if (response.value.err) {
      throw new SendTransactionError({
        action: "simulate",
        signature: "",
        transactionMessage: JSON.stringify(response.value.err),
        logs: response.value.logs ?? [],
      });
    }
    return [response.value.unitsConsumed];
  }
};

const dryRunTransaction = async (
  processOpts: ProcessTransactionOpts,
  connection: Connection,
  versionedTransactions: VersionedTransaction[]
): Promise<TransactionSignature[]> => {
  const response = await simulateBundle(
    processOpts?.bundleSimRpcEndpoint ?? connection.rpcEndpoint,
    versionedTransactions
  );
  const value = response.result.value;

  const err = value.summary !== "succeeded" ? JSON.stringify(value.summary.failed.error) : null;
  const logs = value.transactionResults.flatMap((tx) => tx.logs);
  const unitsConsumed = value.transactionResults[value.transactionResults.length - 1]?.unitsConsumed;

  console.log(err ? `❌ Error: ${err}` : `✅ Success - ${unitsConsumed} CU`);
  console.log("------ Logs 👇 ------");
  if (logs) {
    for (const log of logs) {
      console.log(log);
    }
  }

  if (err)
    throw new SendTransactionError({
      action: "simulate",
      signature: "",
      transactionMessage: JSON.stringify(err),
      logs: logs ?? [],
    });
  return [];
};

// expo

export async function confirmTransaction(
  connection: Connection,
  signature: string,
  commitment: Commitment = "confirmed"
) {
  const getStatus = async () => {
    const commitmentArray: Commitment[] = ["processed", "confirmed", "finalized"];
    const index: number = commitmentArray.indexOf(commitment);
    if (index === -1) throw new Error("Invalid commitment");

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      attempts += 1;

      const status = await connection.getSignatureStatus(signature);

      if (status?.value?.err) {
        throw status.value.err;
      }

      if (status?.value && status.value.confirmationStatus) {
        const confirmationStatusIndex = commitmentArray.indexOf(status.value.confirmationStatus);
        if (confirmationStatusIndex >= index) {
          return status.value;
        }
      }

      await sleep(500);
    }

    throw new Error("Transaction failed to confirm in time.");
  };

  const result = await Promise.race([getStatus(), setTimeoutPromise(20000, `Transaction failed to confirm in time.`)]);

  if (result instanceof Error) {
    throw result;
  }

  return result;
}
