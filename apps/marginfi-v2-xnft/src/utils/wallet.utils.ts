import {
  TransactionMessage,
  VersionedTransaction,
  Transaction,
  PublicKey,
  Connection,
  TransactionInstruction,
} from "@solana/web3.js";

export const solanaSignAndConfirmTransaction = async (
  transaction: Transaction | VersionedTransaction
): Promise<string | undefined> => {
  let result = undefined;
  try {
    result = await window.xnft.solana.sendAndConfirm(transaction);
  } catch (e) {
    console.log(`Error while signing and confirming transaction ${e}`);
  } finally {
    return result;
  }
};

const solanaSendLegacyTransaction = async () => {
  const {
    context: { slot: minContextSlot },
    value: { blockhash },
  } = await window.xnft.solana.connection.getLatestBlockhashAndContext();

  const message = new TransactionMessage({
    payerKey: window.xnft.solana.publicKey,
    instructions: [
      {
        data: Buffer.from("Hello, from your xnft legacy transaction!"),
        keys: [],
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      },
    ],
    recentBlockhash: blockhash,
  });
  const transaction = new VersionedTransaction(message.compileToLegacyMessage());

  const result = await window.xnft.solana.send(transaction, [], {
    minContextSlot,
  });
  console.log("signature from legacy transaction ", result);
};

export const solanaSignAllTransactions = async (transactions: Transaction | VersionedTransaction[]) => {
  const result = await window.xnft.solana.signAllTransactions(transactions);
  console.log("solana sign all transactions", result);
};

export async function generateTransaction(
  connection: Connection,
  wallet: PublicKey | null,
  instructions: TransactionInstruction[]
) {
  if (!wallet) {
    throw new Error("Wallet is not connected");
  }

  let transaction = new Transaction();
  instructions.forEach((instruction) => transaction.add(instruction));
  transaction.recentBlockhash = (await connection.getLatestBlockhash("max")).blockhash;

  return transaction;
}
