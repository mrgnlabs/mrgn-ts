import { PublicKey } from "@solana/web3.js";
import * as nacl from "tweetnacl";
import { SignMessagePayload } from "../types/auth.types";
import base58 from "bs58";

export function generateNonce(): string {
  return crypto.randomUUID();
}

export async function generateSignMessage(walletAddress: string): Promise<SignMessagePayload> {
  return {
    nonce: generateNonce(),
    walletAddress,
    timestamp: Date.now(),
  };
}

export function verifySignature(
  walletAddress: string,
  signature: Uint8Array | { signature: Uint8Array },
  signedMessage: SignMessagePayload
): boolean {
  try {
    const publicKey = new PublicKey(walletAddress);

    // Handle both Phantom and standard wallet adapter signature formats
    // phantom window provider returns { signature: Uint8Array }
    // wallet adapter returns Uint8Array
    const signatureBytes = "signature" in signature ? signature.signature : signature;

    const messageBytes = new TextEncoder().encode(JSON.stringify(signedMessage));

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}
