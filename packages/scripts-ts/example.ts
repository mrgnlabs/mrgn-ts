/**
 * Run with: 
 tsc example.ts
 node example.js
 * or:
 npm install -g ts-node 
 ts-node example.ts
 * 
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";

const DESTINATION_PUBLIC_KEY = new PublicKey(
  "H4QMTHMVbJ3KrB5bz573cBBZKoYSZ2B4mSST1JKzPUrH"
);
const AMOUNT_LAMPORTS = 10;

/// Load local wallet keypair
function loadKeypairFromFile(filePath: string): Keypair {
  const keyData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(keyData));
}

async function main() {
  const connection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
  const wallet = loadKeypairFromFile(
    process.env.HOME + "/.config/solana/id.json"
  );

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: DESTINATION_PUBLIC_KEY,
      lamports: AMOUNT_LAMPORTS,
    })
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      wallet,
    ]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

main().catch((err) => {
  console.error(err);
});
