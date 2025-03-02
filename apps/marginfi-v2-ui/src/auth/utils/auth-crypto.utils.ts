import { PublicKey } from "@solana/web3.js"
import * as nacl from 'tweetnacl'
import { SignMessagePayload } from '../types/auth.types'

export function generateNonce(): string {
  return crypto.randomUUID()
}

export async function generateSignMessage(
  walletAddress: string
): Promise<SignMessagePayload> {
  return {
    nonce: generateNonce(),
    walletAddress,
    timestamp: Date.now()
  }
}

export function verifySignature(
  walletAddress: string,
  signature: string,
  signedMessage: SignMessagePayload
): boolean {
  try {
    const publicKey = new PublicKey(walletAddress)
    const signatureUint8 = Buffer.from(signature, 'base64')
    const messageBytes = new TextEncoder().encode(JSON.stringify(signedMessage))
    
    return nacl.sign.detached.verify(
      messageBytes,
      signatureUint8,
      publicKey.toBytes()
    )
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}