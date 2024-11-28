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
  if (isSequentialTxs) {
    for (const [index, tx] of versionedTransactions.entries()) {
      const signature = await connection.sendTransaction(tx, txOpts);

      try {
        await confirmTransaction(connection, signature, confirmCommitment);
        onCallback?.(index, true, signature);
      } catch (error) {
        onCallback?.(index, false, signature);
        throw error;
      }
      signatures.push(signature);
    }
  } else {
    signatures = await Promise.all(
      versionedTransactions.map(async (versionedTransaction) => {
        const signature = await connection.sendTransaction(versionedTransaction, txOpts);
        return signature;
      })
    );

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
