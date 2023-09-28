import {
  ConfirmOptions,
  Connection,
  Keypair,
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
