import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  TransactionOptions,
  TransactionBroadcastType,
  simulateBundle,
  DEFAULT_CONFIRM_OPTS,
  MARGINFI_PROGRAM,
  Wallet,
} from "@mrgnlabs/mrgn-common";
import {
  VersionedTransaction,
  Transaction,
  Signer,
  TransactionSignature,
  Connection,
  TransactionMessage,
  SendTransactionError,
  ConfirmOptions,
  AddressLookupTableAccount,
  PublicKey,
} from "@solana/web3.js";
import { parseTransactionError, ProcessTransactionError, ProcessTransactionErrorType } from "../../errors";
import { formatTransactions, sendTransactionAsBundle } from "./transaction.helper";

export interface ProcessTransactionOpts extends ProcessTransactionsClientOpts {
  isReadOnly?: boolean;
  programId?: PublicKey;
  bundleSimRpcEndpoint?: string;
}

export type ProcessTransactionsClientOpts = {
  broadcastType?: TransactionBroadcastType;
  priorityFeeUi?: number;
  isSequentialTxs?: boolean;
};

export type SolanaTransaction = (VersionedTransaction | Transaction) & {
  signers?: Array<Signer>;
  addressLookupTables?: AddressLookupTableAccount[];
};

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
 * @param {TransactionOptions} [props.txOpts] - Optional transaction options.
 * @param {ProcessTransactionOpts} [props.processOpts] - Optional processing options.
 *
 * @returns {Promise<TransactionSignature[]>} - A promise that resolves to an array of transaction signatures.
 *
 * @throws {ProcessTransactionError} - Throws an error if transaction processing fails.
 */
export async function processTransactions({
  transactions,
  connection,
  wallet,
  txOpts,
  processOpts,
}: ProcessTransactionsProps): Promise<TransactionSignature[]> {
  let signatures: TransactionSignature[] = [""];

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
      processOpts?.broadcastType ?? "BUNDLE",
      processOpts?.priorityFeeUi ?? 0,
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

      let sendTxsRpc = async (versionedTransaction: VersionedTransaction[]): Promise<string[]> => [];

      // if (processOpts?.isSequentialTxs) {
      //   sendTxsRpc = async (txs: VersionedTransaction[]) => {
      //     let sigs = [];
      //     for (const tx of txs) {
      //       const signature = await connection.sendTransaction(tx, {
      //         // minContextSlot: mergedOpts.minContextSlot,
      //         skipPreflight: mergedOpts.skipPreflight,
      //         preflightCommitment: mergedOpts.preflightCommitment,
      //         maxRetries: mergedOpts.maxRetries,
      //       });
      //       await connection.confirmTransaction(
      //         {
      //           blockhash,
      //           lastValidBlockHeight,
      //           signature,
      //         },
      //         "confirmed"
      //       );
      //       sigs.push(signature);
      //     }
      //     return sigs;
      //   };
      // } else {
      //   sendTxsRpc = async (txs: VersionedTransaction[]) =>
      //     await Promise.all(
      //       txs.map(async (versionedTransaction) => {
      //         const signature = await connection.sendTransaction(versionedTransaction, {
      //           // minContextSlot: mergedOpts.minContextSlot,
      //           skipPreflight: mergedOpts.skipPreflight,
      //           preflightCommitment: mergedOpts.preflightCommitment,
      //           maxRetries: mergedOpts.maxRetries,
      //         });
      //         return signature;
      //       })
      //     );
      // }

      if (processOpts?.broadcastType === "BUNDLE") {
        signatures = await sendTransactionAsBundle(base58Txs).catch(
          async () => await sendTxsRpc(versionedTransactions)
        );
      } else {
        signatures = await sendTxsRpc(versionedTransactions);
      }

      await Promise.all(
        signatures.map(async (signature) => {
          await connection.confirmTransaction(
            {
              blockhash,
              lastValidBlockHeight,
              signature,
            },
            mergedOpts.commitment
          );
        })
      );
    }
    return signatures;
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

// expo
