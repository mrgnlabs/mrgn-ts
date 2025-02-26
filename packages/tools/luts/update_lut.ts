import {
  AddressLookupTableProgram,
  Connection,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import { DEFAULT_API_URL, loadEnvFile, loadKeypairFromFile } from "../scripts/utils";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

/**
 * If true, send the tx. If false, output the unsigned b58 tx to console.
 */
const sendTx = true;

type Config = {
  LUT: PublicKey;
  KEYS: PublicKey[];
};

const config: Config = {
  LUT: new PublicKey("CQ8omkUwDtsszuJLo9grtXCeEyDU4QqBLRv9AjRDaUZ3"),
  KEYS: [
    new PublicKey("MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA"),
    new PublicKey("CYXEgwbPHu2f9cY3mcUkinzDoDcsSan7myh1uBvYRbEw"),
    new PublicKey("4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8"),
    new PublicKey("HoMNdUF3RDZDPKAARYK1mxcPFfUnPjLmpKYibZzAijev"),
    new PublicKey("JAnRanMrsn5vxWmSpU5ndvtvQLAyzGJEenNzgVC1vNMC"),
    new PublicKey("5tMcLP49P7CHKEM4KWAiSDNpEh5UFcCLsMVXi74YRg5C"),
    SYSTEM_PROGRAM_ID,
    SYSVAR_RENT_PUBKEY,
    TOKEN_PROGRAM_ID,
    new PublicKey("ezSoL6fY1PVdJcJsUpe5CM3xkfmy3zoVCABybm5WtiC"),
  ],
};

async function main() {
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  const connection = new Connection(apiUrl, "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/phantom-wallet.json");

  const transaction = new Transaction();

  const lutAccount = await connection.getAddressLookupTable(config.LUT);
  if (!lutAccount.value) {
    throw new Error("Failed to fetch the lookup table account");
  }

  // Extract the existing addresses from the lookup table
  const existingAddresses = lutAccount.value.state.addresses;
  const existingSet = new Set(existingAddresses.map((addr: PublicKey) => addr.toBase58()));

  // Filter out keys that are already in the lookup table
  const keysToAdd = config.KEYS.filter((key) => !existingSet.has(key.toBase58()));
  if (keysToAdd.length === 0) {
    console.log("No new keys to add, lookup table is already up to date, aborting.");
    return;
  } else {
    console.log("Adding the following new keys, others already in the LUT");
    for (let i = 0; i < keysToAdd.length; i++) {
      console.log("[" + i + "] " + keysToAdd[i]);
    }
    console.log("");
  }

  // Create the instruction to extend the lookup table with the deduped keys
  const extendIx = AddressLookupTableProgram.extendLookupTable({
    authority: wallet.publicKey,
    lookupTable: config.LUT,
    payer: wallet.publicKey,
    addresses: keysToAdd,
  });
  transaction.add(extendIx);

  if (sendTx) {
    try {
      const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  } else {
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: true,
    });
    const base58Transaction = bs58.encode(serializedTransaction);
    console.log("Base58-encoded transaction:", base58Transaction);
  }
}

main().catch((err) => {
  console.error(err);
});
