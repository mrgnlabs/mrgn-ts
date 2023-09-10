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

export const solanaSignMessage = async (message: string) => {
  const result = await window.xnft.solana.signMessage(Buffer.from(message));
  console.log("solana sign message", result);
};

export const solanaSendTransaction = async (transaction: Transaction | VersionedTransaction) => {
  const result = await window.xnft.solana.send(transaction);
  console.log("solana send transaction", result);
  return result;
};

export const solanaSignTransaction = async (transaction: Transaction | VersionedTransaction) => {
  const result = await window.xnft.solana.signTransaction(transaction);
  console.log("solana sign transaction", result);
  return result;
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
  // const transactions = [
  //   new Transaction().add(
  //     SystemProgram.transfer({
  //       fromPubkey: window.xnft.solana.publicKey,
  //       toPubkey: new PublicKey("H4YJ7ESVkiiP9tGeQJy9jKVSHk98tSAUD3LqTowH9tEY"),
  //       lamports: 1,
  //     })
  //   ),
  //   new Transaction().add(
  //     SystemProgram.transfer({
  //       fromPubkey: window.xnft.solana.publicKey,
  //       toPubkey: new PublicKey("H4YJ7ESVkiiP9tGeQJy9jKVSHk98tSAUD3LqTowH9tEY"),
  //       lamports: 1,
  //     })
  //   ),
  // ];

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
