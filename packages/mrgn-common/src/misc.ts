import {
  AccountInfo,
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  Signer,
  Transaction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import { TransactionOptions, Wallet } from "./types";
import { DEFAULT_CONFIRM_OPTS } from "./constants";
import base58 from "bs58";

/**
 * Load Keypair from the provided file.
 */
export function loadKeypair(keypairPath: string): Keypair {
  const path = require("path");
  if (!keypairPath || keypairPath == "") {
    throw new Error("Keypair is required!");
  }
  if (keypairPath[0] === "~") {
    keypairPath = path.join(require("os").homedir(), keypairPath.slice(1));
  }
  const keyPath = path.normalize(keypairPath);
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(require("fs").readFileSync(keyPath).toString())));
}

export function getValueInsensitive<T>(map: Record<string, T>, key: string): T {
  const lowerCaseLabel = key.toLowerCase();
  for (let key in map) {
    if (key.toLowerCase() === lowerCaseLabel) {
      return map[key];
    }
  }
  throw new Error(`Token metadata not found for ${key}`);
}

/**
 * Transaction processing and error-handling helper.
 */
export async function processTransaction(
  connection: Connection,
  wallet: Wallet,
  transaction: Transaction | VersionedTransaction,
  signers?: Array<Signer>,
  opts?: TransactionOptions
): Promise<TransactionSignature> {
  let signature: TransactionSignature = "";

  try {
    let versionedTransaction: VersionedTransaction;

    const {
      context: { slot: minContextSlot },
      value: { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    if (transaction instanceof Transaction) {
      const versionedMessage = new TransactionMessage({
        instructions: transaction.instructions,
        payerKey: wallet.publicKey,
        recentBlockhash: blockhash,
      });

      versionedTransaction = new VersionedTransaction(versionedMessage.compileToV0Message([]));
    } else {
      versionedTransaction = transaction;
    }

    if (signers) versionedTransaction.sign(signers);

    if (opts?.dryRun) {
      const response = await connection.simulateTransaction(
        versionedTransaction,
        opts ?? { minContextSlot, sigVerify: false }
      );
      console.log(
        response.value.err ? `❌ Error: ${response.value.err}` : `✅ Success - ${response.value.unitsConsumed} CU`
      );
      console.log("------ Logs 👇 ------");
      console.log(response.value.logs);

      const signaturesEncoded = encodeURIComponent(
        JSON.stringify(versionedTransaction.signatures.map((s) => base58.encode(s)))
      );
      const messageEncoded = encodeURIComponent(
        Buffer.from(versionedTransaction.message.serialize()).toString("base64")
      );
      console.log(Buffer.from(versionedTransaction.message.serialize()).toString("base64"));

      const urlEscaped = `https://explorer.solana.com/tx/inspector?cluster=mainnet&signatures=${signaturesEncoded}&message=${messageEncoded}`;
      console.log("------ Inspect 👇 ------");
      console.log(urlEscaped);

      return versionedTransaction.signatures[0].toString();
    } else {
      versionedTransaction = await wallet.signTransaction(versionedTransaction);

      let mergedOpts: ConfirmOptions = {
        ...DEFAULT_CONFIRM_OPTS,
        commitment: connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment,
        preflightCommitment: connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment,
        minContextSlot,
        ...opts,
      };

      signature = await connection.sendTransaction(versionedTransaction, {
        minContextSlot: mergedOpts.minContextSlot,
        skipPreflight: mergedOpts.skipPreflight,
        preflightCommitment: mergedOpts.preflightCommitment,
        maxRetries: mergedOpts.maxRetries,
      });
      await connection.confirmTransaction(
        {
          blockhash,
          lastValidBlockHeight,
          signature,
        },
        mergedOpts.commitment
      );
      return signature;
    }
  } catch (error: any) {
    if (error.logs) {
      console.log("------ Logs 👇 ------");
      console.log(error.logs.join("\n"));
    }

    throw `Transaction failed! ${error?.message}`;
  }
}

/**
 * @internal
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunks<T>(array: T[], size: number): T[][] {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map((_, index) =>
    array.slice(index * size, (index + 1) * size)
  );
}

interface Result {
  jsonrpc: string;
  result: {
    context: { slot: number };
    value: Array<AccountInfo<string[]> | null>;
  };
}

export async function chunkedGetRawMultipleAccountInfos(
  connection: Connection,
  pks: string[],
  batchChunkSize: number = 1000,
  maxAccountsChunkSize: number = 100
): Promise<[number, Map<string, AccountInfo<Buffer>>]> {
  const accountInfoMap = new Map<string, AccountInfo<Buffer>>();
  let contextSlot = 0;

  const batches = chunkArray(pks, batchChunkSize);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const batchRequest = chunkArray(batch, maxAccountsChunkSize).map((pubkeys) => ({
      methodName: "getMultipleAccounts",
      args: connection._buildArgs([pubkeys], "confirmed", "base64"),
    }));

    let accountInfos: Array<AccountInfo<string[]> | null> = [];
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries && accountInfos.length === 0) {
      try {
        accountInfos = await connection
          // @ts-ignore
          ._rpcBatchRequest(batchRequest)
          .then((batchResults: Result[]) => {
            contextSlot = Math.max(...batchResults.map((res) => res.result.context.slot));

            const accounts = batchResults.reduce((acc, res) => {
              acc.push(...res.result.value);
              return acc;
            }, [] as Result["result"]["value"]);

            return accounts;
          });
      } catch (error) {
        retries++;
      }
    }

    if (accountInfos.length === 0) {
      throw new Error(`Failed to fetch account infos after ${maxRetries} retries`);
    }

    accountInfos.forEach((item, index) => {
      const publicKey = batch[index];
      if (item) {
        accountInfoMap.set(publicKey, {
          ...item,
          owner: new PublicKey(item.owner),
          data: Buffer.from(item.data[0], "base64"),
        });
      }
    });
  }

  return [contextSlot, accountInfoMap];
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
