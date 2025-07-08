import { VersionedTransaction, TransactionSignature, Connection, Commitment } from "@solana/web3.js";
import { TransactionOptions } from "@mrgnlabs/mrgn-common";

import { confirmTransaction } from "../transaction.service";

type SendTransactionAsRpcProps = {
  versionedTransactions: VersionedTransaction[];
  connection: Connection;
  blockStrategy: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
  isSequentialTxs: boolean;
  confirmCommitment?: Commitment;
  txOpts?: TransactionOptions;
  throwError?: boolean;
  onCallback?: (index: number, success: boolean, sig: string) => void;
};

export async function sendTransactionAsBundleRpc({
  versionedTransactions,
  txOpts,
  connection,
  onCallback,
  blockStrategy,
  confirmCommitment,
  isSequentialTxs,
  throwError = false,
}: SendTransactionAsRpcProps): Promise<TransactionSignature[]> {
  let signatures: TransactionSignature[] = [];
  let hasValidationErrors = false;

  if (isSequentialTxs) {
    for (const [index, tx] of versionedTransactions.entries()) {
      let signature: TransactionSignature;

      try {
        signature = await connection.sendTransaction(tx, txOpts);
      } catch (error) {
        // Handle the specific "fallthrough error ea" and other sendTransaction errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("Expected the value to satisfy a union") ||
          errorMessage.includes("satisfy a union")
        ) {
          console.warn("Transaction type validation error:", errorMessage);
          onCallback?.(index, false, "");
          hasValidationErrors = true;
          continue;
        }
        // Re-throw other errors
        onCallback?.(index, false, "");
        throw error;
      }

      try {
        await confirmTransaction(connection, signature, confirmCommitment);
        onCallback?.(index, true, signature);
      } catch (error) {
        onCallback?.(index, false, signature);
        throw error;
      }
      signatures.push(signature);
    }

    // Throw user-friendly error if validation errors occurred
    if (hasValidationErrors) {
      throw new Error(
        "Transaction failed to confirm. The transaction might have landed on-chain but confirmation failed. Please check your wallet and try again."
      );
    }
  } else {
    signatures = await Promise.all(
      versionedTransactions.map(async (versionedTransaction, index) => {
        try {
          const signature = await connection.sendTransaction(versionedTransaction, txOpts);
          return signature;
        } catch (error) {
          // Handle the specific "fallthrough error ea" and other sendTransaction errors
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (
            errorMessage.includes("Expected the value to satisfy a union") ||
            errorMessage.includes("satisfy a union")
          ) {
            console.warn("Transaction type validation error:", errorMessage);
            onCallback?.(index, false, "");
            hasValidationErrors = true;
            return ""; // Return empty signature to continue processing
          }
          // Re-throw other errors
          onCallback?.(index, false, "");
          throw error;
        }
      })
    );

    // Filter out empty signatures from failed transactions
    signatures = signatures.filter((sig) => sig !== "");

    // Throw user-friendly error if validation errors occurred
    if (hasValidationErrors) {
      throw new Error(
        "Transaction failed to confirm. The transaction might have landed on-chain but confirmation failed. Please check your wallet and try again."
      );
    }

    await Promise.all(
      signatures.map(async (signature, index) => {
        try {
          const result = await confirmTransaction(connection, signature, confirmCommitment);
          onCallback?.(index, true, signature);
          return result;
        } catch (error) {
          onCallback?.(index, false, signature);
          throw error;
        }
      })
    );
  }

  return signatures;
}
