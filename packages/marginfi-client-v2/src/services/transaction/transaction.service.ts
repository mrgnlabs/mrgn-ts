import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  TransactionOptions,
  TransactionBroadcastType,
  DEFAULT_CONFIRM_OPTS,
  Wallet,
  SolanaTransaction,
  sleep,
  setTimeoutPromise,
  legacyTxToV0Tx,
  isV0Tx,
  addTransactionMetadata,
  microLamportsToUi,
  getComputeBudgetUnits,
  SKIP_SIMULATION,
} from "@mrgnlabs/mrgn-common";
import {
  VersionedTransaction,
  TransactionSignature,
  Connection,
  ConfirmOptions,
  PublicKey,
  Commitment,
  SimulatedTransactionResponse,
  SolanaJSONRPCError,
} from "@solana/web3.js";

import { parseTransactionError, ProcessTransactionError, ProcessTransactionErrorType } from "../../errors";
import {
  formatTransactions,
  sendTransactionAsGrpcBundle,
  sendTransactionAsBundle,
  sendTransactionAsBundleRpc,
  simulateBundle,
  RpcSimulateBundleTransactionResult,
  isSimulatedTransactionResponse,
  BundleSimulationError,
  SendBundleError,
} from "./helpers";
import { Transaction } from "@solana/web3.js";

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
  addArenaTxTag?: boolean;
}

export type PriorityFees = {
  bundleTipUi?: number;
  priorityFeeMicro?: number;
  maxCapUi?: number;
};

export type BroadcastMethodType = Extract<TransactionBroadcastType, "BUNDLE" | "RPC">;

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
  addArenaTxTag?: boolean;
  callback?: (index?: number, success?: boolean, signature?: string, stepsToAdvance?: number) => void;
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
    console.error("Failed to get latest blockhash and context", error);

    if (error instanceof SolanaJSONRPCError) {
      throw error;
    }

    throw new ProcessTransactionError({
      message: "Failed to get latest blockhash and context.",
      type: ProcessTransactionErrorType.TransactionBuildingError,
      failedTxs: transactions,
    });
  }

  let mergedOpts: ConfirmOptions = {
    ...DEFAULT_CONFIRM_OPTS,
    commitment,
    preflightCommitment: commitment,
    minContextSlot,
    ...txOpts,
  };

  let updatedTransactions: SolanaTransaction[] = transactions;

  try {
    const simulationResult = await simulateTransactions(processOpts, connection, transactions, mergedOpts, {
      feePayer: wallet.publicKey,
      blockhash,
    });

    const unitsConsumed = isSimulatedTransactionResponse(simulationResult)
      ? [simulationResult.unitsConsumed]
      : simulationResult.map((tx) => (tx.unitsConsumed ? Number(tx.unitsConsumed) : undefined));

    updatedTransactions = transactions.map((tx, idx) =>
      addTransactionMetadata(tx, {
        ...tx,
        unitsConsumed: unitsConsumed[idx],
      })
    );
  } catch {
    // only to estimate compute units, final simulation is done just before sending
  }

  const maxCapUi = processOpts.maxCapUi;

  console.log("------ Transaction Details 👇 ------");
  console.log(`📝 Executing ${transactions.length} transaction${transactions.length > 1 ? "s" : ""}`);
  console.log(`📡 Broadcast type: ${broadcastType}`);
  if (broadcastType === "BUNDLE") {
    console.log(
      `💸 Bundle tip: ${maxCapUi ? Math.min(processOpts.bundleTipUi ?? 0, maxCapUi) : processOpts.bundleTipUi} SOL`
    );
  } else {
    updatedTransactions.forEach((tx, idx) => {
      const cu = tx.unitsConsumed ? Math.min(tx.unitsConsumed + 50_000, 1_400_000) : getComputeBudgetUnits(tx);
      const priorityFeeUi = maxCapUi
        ? Math.min(processOpts.priorityFeeMicro ? microLamportsToUi(processOpts.priorityFeeMicro, cu) : 0, maxCapUi)
        : processOpts.priorityFeeMicro
        ? microLamportsToUi(processOpts.priorityFeeMicro, cu)
        : 0;
      console.log(`💸 Priority fee for tx ${idx}: ${priorityFeeUi} SOL`);
    });
  }
  console.log("--------------------------------");

  versionedTransactions = formatTransactions(
    updatedTransactions,
    broadcastType,
    blockhash,
    {
      priorityFeeMicro: processOpts.priorityFeeMicro ?? 0,
      bundleTipUi: processOpts.bundleTipUi ?? 0,
      feePayer: wallet.publicKey,
   
      maxCapUi,
    },
    processOpts.addArenaTxTag
  );

  let signatures: TransactionSignature[] = [];
  let bundleSignature: string | undefined;

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

      // Updating after 'sign in wallet' step in toast
      // If the transactions are bundled, we need to advance the toast by the number of transactions.
      if (broadcastType === "BUNDLE") {
        const stepsToAdvance = versionedTransactions.length;
        processOpts.callback?.(undefined, true, undefined, stepsToAdvance);
      } else {
        processOpts.callback?.(undefined, true);
      }

      let simulateTxs: (() => Promise<SimulatedTransactionResponse | RpcSimulateBundleTransactionResult[]>) | null =
        null;
      if (!SKIP_SIMULATION) {
        simulateTxs = async () =>
          await simulateTransactions(processOpts, connection, versionedTransactions, mergedOpts);
      }

      const sendTxBundleGrpc = async (throwError: boolean) =>
        await sendTransactionAsGrpcBundle(connection, base58Txs, throwError);
      const sendTxBundleApi = async (throwError: boolean, bundleId?: string) =>
        await sendTransactionAsBundle(connection, base58Txs, throwError, bundleId);
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

      for (const [idx, method] of finalFallbackMethod.entries()) {
        const isLast = idx === finalFallbackMethod.length - 1;
        if (idx === 0 && simulateTxs && !SKIP_SIMULATION) {
          await simulateTxs();
        }

        let temporaryBundleSignature: string | undefined;
        let sig: string | undefined;
        let sigs: string[] | undefined;
        switch (method.method) {
          case "GRPC_BUNDLE":
            // always throw error, this is temporary as bundle already processed isn't catched well
            sig = await sendTxBundleGrpc(true).catch((error) => {
              if (error?.bundleId) {
                temporaryBundleSignature = error.bundleId;
              }

              if (isLast) throw error;
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

      if (bundleSignature || signatures.length > 0) {
        console.log("------ Transaction Success ✅ ------");
        if (bundleSignature) {
          console.log("Bundle signature:", bundleSignature);
        }
        if (signatures.length > 0) {
          console.log("Transaction signatures:", signatures.join(", "));
        }
        console.log("--------------------------------");
      }

      if (signatures.length !== 0) {
        return signatures;
      } else {
        if (!bundleSignature) throw new Error("API bundle failed: unknown error");
        return [bundleSignature];
      }
    }
  } catch (error: any) {
    const failedTxs = transactions.splice(signatures.length);

    if (error instanceof SolanaJSONRPCError) {
      throw error;
    }

    if (error instanceof ProcessTransactionError) {
      throw ProcessTransactionError.withFailedTransactions(error, failedTxs);
    }

    if (error instanceof SendBundleError) {
      // the bundle failed to land not much info we can gather from failing bundles
      throw new ProcessTransactionError({
        message: error.message,
        type: ProcessTransactionErrorType.TransactionSendingError,
        programId: MARGINFI_PROGRAM.toBase58(),
        failedTxs: failedTxs,
      });
    }

    const parsedError = parseTransactionError(error, processOpts?.programId ?? MARGINFI_PROGRAM);

    if (error?.logs?.length > 0) {
      console.log("------ Logs 👇 ------");
      console.log(error.logs.join("\n"));
      if (parsedError) {
        console.log("Parsed:", parsedError);
        throw new ProcessTransactionError({
          message: parsedError.description,
          type: ProcessTransactionErrorType.TransactionSendingError,
          logs: error.logs,
          programId: parsedError.programId,
        });
      }
    }
    console.log("fallthrough error", error);
    throw new ProcessTransactionError({
      message: parsedError?.description ?? "Something went wrong",
      type: ProcessTransactionErrorType.FallthroughError,
      logs: error.logs,
      programId: parsedError.programId,
    });
  }
}

export const simulateTransactions = async (
  processOpts: ProcessTransactionOpts,
  connection: Connection,
  solanaTransactions: VersionedTransaction[] | Transaction[] | SolanaTransaction[],
  confirmOpts?: ConfirmOptions,
  txOpts?: {
    feePayer: PublicKey;
    blockhash: string;
  }
): Promise<SimulatedTransactionResponse | RpcSimulateBundleTransactionResult[]> => {
  const v0Txs = solanaTransactions.map((tx) => (isV0Tx(tx) ? tx : legacyTxToV0Tx(tx, txOpts)));

  try {
    if (v0Txs.length > 1) {
      const response = await simulateBundle(processOpts?.bundleSimRpcEndpoint ?? connection.rpcEndpoint, v0Txs);
      return response;
    } else {
      const response = await connection.simulateTransaction(v0Txs[0], {
        sigVerify: false,
        commitment: confirmOpts?.commitment,
        replaceRecentBlockhash: false,
        minContextSlot: confirmOpts?.minContextSlot,
      });
      if (response.value.err) {
        const error = response.value.err;
        const parsedError = parseTransactionError(error, processOpts?.programId ?? MARGINFI_PROGRAM);
        throw new ProcessTransactionError({
          message: parsedError.description ?? JSON.stringify(response.value.err),
          type: ProcessTransactionErrorType.SimulationError,
          logs: response.value.logs ?? [],
          programId: parsedError.programId,
        });
      }
      return response.value;
    }
  } catch (error) {
    if (error instanceof BundleSimulationError) {
      const parsedError = parseTransactionError(error, processOpts?.programId ?? MARGINFI_PROGRAM);
      throw new ProcessTransactionError({
        message: parsedError.description,
        type: ProcessTransactionErrorType.SimulationError,
        logs: error.logs,
        programId: parsedError.programId,
      });
    }

    throw error;
  }
};

const dryRunTransaction = async (
  processOpts: ProcessTransactionOpts,
  connection: Connection,
  versionedTransactions: VersionedTransaction[]
): Promise<TransactionSignature[]> => {
  try {
    const response = await simulateBundle(
      processOpts?.bundleSimRpcEndpoint ?? connection.rpcEndpoint,
      versionedTransactions
    );

    console.log("------ Units Consumed 👇 ------");
    for (const tx of response) {
      console.log(`✅ Success - ${tx.unitsConsumed} CU`);
    }

    console.log("------ Logs 👇 ------");
    for (const tx of response) {
      console.log(tx.logs);
    }
  } catch (error) {
    if (error instanceof BundleSimulationError) {
      console.log(`❌ Error: ${error.message}`);
      console.log("------ Logs 👇 ------");
      if (error.logs) {
        for (const log of error.logs) {
          console.log(log);
        }
      }
    }
    throw error;
  }

  return [];
};

// expo

export async function confirmBundle(connection: Connection, bundleId: string, commitment: Commitment = "confirmed") {
  const getStatus = async () => {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      await sleep(2000);
      attempts += 1;

      const getBundleStatus = await fetch("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBundleStatuses",
          params: [[bundleId]],
        }),
      });

      const bundleStatus = await getBundleStatus.json();
      if (bundleStatus.result.value) {
        if (bundleStatus.result.value[0].bundle_id) {
          const commitmentStatus = bundleStatus.result.value[0].confirmation_status;

          if (commitmentStatus === "confirmed") {
            return bundleId;
          }
        }
      }

      console.log("🔄 Waiting for confirmation...");
    }
    console.log("❌ Transaction failed to confirm in time.");
    throw new Error("Transaction failed to confirm in time.");
  };

  const result = await Promise.race([getStatus(), setTimeoutPromise(20000, `Transaction failed to confirm in time.`)]);

  if (result instanceof Error) {
    throw result;
  }

  return result;
}

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
    const maxAttempts = 8;

    while (attempts < maxAttempts) {
      attempts += 1;

      const status = await connection.getSignatureStatus(signature);

      if (status?.value?.err) {
        console.error("❌ Error:", status.value.err);
        throw status.value.err;
      }

      if (status?.value && status.value.confirmationStatus) {
        const confirmationStatusIndex = commitmentArray.indexOf(status.value.confirmationStatus);
        if (confirmationStatusIndex >= index) {
          return status.value;
        }
      }

      console.log("🔄 Waiting for confirmation...");

      await sleep(2000);
    }
    console.log("❌ Transaction failed to confirm in time.");
    throw new Error("Transaction failed to confirm in time.");
  };

  const result = await Promise.race([getStatus(), setTimeoutPromise(20000, `Transaction failed to confirm in time.`)]);

  if (result instanceof Error) {
    throw result;
  }

  return result;
}
