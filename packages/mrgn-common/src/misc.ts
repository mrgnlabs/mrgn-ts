import { AnchorProvider } from "@project-serum/anchor";
import { ConfirmOptions, Connection, Keypair, Signer, Transaction, TransactionSignature } from "@solana/web3.js";

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
  provider: AnchorProvider,
  tx: Transaction,
  signers?: Array<Signer>,
  opts?: ConfirmOptions
): Promise<TransactionSignature> {
  const connection = new Connection(provider.connection.rpcEndpoint, provider.opts);
  const {
    context: { slot: minContextSlot },
    value: { blockhash, lastValidBlockHeight },
  } = await connection.getLatestBlockhashAndContext();

  tx.recentBlockhash = blockhash;
  tx.feePayer = provider.wallet.publicKey;
  tx = await provider.wallet.signTransaction(tx);

  if (signers === undefined) {
    signers = [];
  }
  signers
    .filter((s) => s !== undefined)
    .forEach((kp) => {
      tx.partialSign(kp);
    });

  try {
    const signature = await connection.sendRawTransaction(
      tx.serialize(),
      opts || {
        skipPreflight: false,
        preflightCommitment: provider.connection.commitment,
        commitment: provider.connection.commitment,
        minContextSlot,
      }
    );
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature,
    });
    return signature;
  } catch (e: any) {
    console.log(e);
    throw e;
  }
}

/**
 * @internal
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
