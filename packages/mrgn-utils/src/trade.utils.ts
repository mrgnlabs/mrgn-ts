import { SolanaTransaction, TransactionType, addTransactionMetadata } from "@mrgnlabs/mrgn-common";

export function addArenaTxTypes(txs: SolanaTransaction[], tradeState: "long" | "short") {
  return txs.map((tx) =>
    tx.type === TransactionType.LOOP
      ? addTransactionMetadata(tx, {
          ...tx,
          type: tradeState === "long" ? TransactionType.LONG : TransactionType.SHORT,
        })
      : tx
  );
}
