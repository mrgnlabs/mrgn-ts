import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { MEMO_PROGRAM_ID, Wallet } from "@mrgnlabs/mrgn-common";
import * as nacl from "tweetnacl";
import { SignMessagePayload } from "../types/auth.types";

export function generateNonce(): string {
  return crypto.randomUUID();
}

// Create a function to generate a user-friendly message string
export function createSignatureMessage(walletAddress: string): string {
  return `Welcome to marginfi!

Sign this message to securely authenticate your wallet.

This request will not trigger a transaction or require amy fees.

Wallet: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}
`;
}

export function generateSignMessage(walletAddress: string): SignMessagePayload {
  const nonce = generateNonce();
  const timestamp = Date.now();

  const payload: SignMessagePayload = {
    nonce,
    walletAddress,
    timestamp,
    formattedMessage: createSignatureMessage(walletAddress),
  };

  return payload;
}

export function verifySignature(walletAddress: string, signature: Uint8Array | { signature: Uint8Array }): boolean {
  try {
    const publicKey = new PublicKey(walletAddress);

    // Handle both Phantom and standard wallet adapter signature formats
    const signatureBytes = "signature" in signature ? signature.signature : signature;

    const messageString = createSignatureMessage(walletAddress);
    const messageBytes = new TextEncoder().encode(messageString);

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

export async function signTransactionWithMemoForAuth(
  wallet: Wallet,
  messageToSign: string,
  connection: Connection
): Promise<{ signature: string }> {
  try {
    const transaction = new Transaction();
    -transaction.add({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(messageToSign, "utf-8"),
    });

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    const signedTransaction = await wallet.signTransaction(transaction);

    const serializedTransaction = signedTransaction.serialize();
    const signature = Buffer.from(serializedTransaction).toString("base64");

    return {
      signature,
    };
  } catch (error) {
    console.error("Error signing transaction with memo:", error);
    throw error;
  }
}
