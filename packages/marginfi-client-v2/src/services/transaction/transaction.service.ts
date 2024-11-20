import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  TransactionOptions,
  TransactionBroadcastType,
  simulateBundle,
  DEFAULT_CONFIRM_OPTS,
  Wallet,
  SolanaTransaction,
} from "@mrgnlabs/mrgn-common";
import {
  VersionedTransaction,
  TransactionSignature,
  Connection,
  SendTransactionError,
  ConfirmOptions,
  PublicKey,
} from "@solana/web3.js";

import { parseTransactionError, ProcessTransactionError, ProcessTransactionErrorType } from "../../errors";
import {
  formatTransactions,
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
    const getLatestBlockhashAndContext = await connection.getLatestBlockhashAndContext("confirmed");

    minContextSlot = getLatestBlockhashAndContext.context.slot - 4;
    blockhash = getLatestBlockhashAndContext.value.blockhash;
    lastValidBlockHeight = getLatestBlockhashAndContext.value.lastValidBlockHeight;

    versionedTransactions = formatTransactions(
      transactions,
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

      let mergedOpts: ConfirmOptions = {
        ...DEFAULT_CONFIRM_OPTS,
        commitment: connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment,
        preflightCommitment: connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment,
        minContextSlot,
        ...txOpts,
      };

      const simulateTxs = async () => await simulateTransactions(processOpts, connection, versionedTransactions);
      const sendTxBundleGrpc = async (isLast: boolean) => await sendTransactionAsGrpcBundle(base58Txs, isLast);
      const sendTxBundleApi = async (isLast: boolean) => await sendTransactionAsBundle(base58Txs, isLast);
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

        let sig: string | undefined;
        let sigs: string[] | undefined;
        switch (method.method) {
          case "GRPC_BUNDLE":
            sig = await sendTxBundleGrpc(isLast);
            if (sig) bundleSignature = sig;
            break;
          case "API_BUNDLE":
            sig = await sendTxBundleApi(isLast);
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
  versionedTransactions: VersionedTransaction[]
): Promise<TransactionSignature[]> => {
  if (versionedTransactions.length > 1) {
    const response = await simulateBundle(
      processOpts?.bundleSimRpcEndpoint ?? connection.rpcEndpoint,
      versionedTransactions
    ).catch((error) => {
      throw new SendTransactionError({
        action: "simulate",
        signature: "",
        transactionMessage: JSON.stringify(error),
        logs: [],
      });
    });

    if (response.value.err) {
      throw new SendTransactionError({
        action: "simulate",
        signature: "",
        transactionMessage: JSON.stringify(response.value.err),
        logs: response.value.logs ?? [],
      });
    }
  } else {
    const response = await connection.simulateTransaction(versionedTransactions[0], {
      sigVerify: false,
    });
    if (response.value.err) {
      throw new SendTransactionError({
        action: "simulate",
        signature: "",
        transactionMessage: JSON.stringify(response.value.err),
        logs: response.value.logs ?? [],
      });
    }
  }

  return [];
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
  console.log(
    response.value.err ? `❌ Error: ${response.value.err}` : `✅ Success - ${response.value.unitsConsumed} CU`
  );
  console.log("------ Logs 👇 ------");
  if (response.value.logs) {
    for (const log of response.value.logs) {
      console.log(log);
    }
  }

  if (response.value.err)
    throw new SendTransactionError({
      action: "simulate",
      signature: "",
      transactionMessage: JSON.stringify(response.value.err),
      logs: response.value.logs ?? [],
    });
  return [];
};

// expo
