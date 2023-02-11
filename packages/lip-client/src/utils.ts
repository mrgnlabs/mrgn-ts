import { AnchorProvider, BN } from "@project-serum/anchor";
import {
  ConfirmOptions,
  Connection,
  Signer,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { Amount } from "./types";

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

/**
 * Converts a ui representation of a token amount into its native value as `BN`, given the specified mint decimal amount (default to 6 for USDC).
 */
export function toBigNumber(amount: Amount | BN): BigNumber {
  let amt: BigNumber;
  if (amount instanceof BigNumber) {
    amt = amount;
  } else {
    amt = new BigNumber(amount.toString());
  }
  return amt;
}

/**
 * Converts a UI representation of a token amount into its native value as `BN`, given the specified mint decimal amount (default to 6 for USDC).
 */
export function uiToNative(amount: Amount, decimals: number): BN {
  let amt = toBigNumber(amount);
  return new BN(amt.times(10 ** decimals).toFixed(0, BigNumber.ROUND_FLOOR));
}

