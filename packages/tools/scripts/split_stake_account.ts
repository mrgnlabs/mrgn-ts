import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  StakeProgram,
} from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { loadKeypairFromFile } from "./utils";
import dotenv from "dotenv";

dotenv.config();

/**
 * Configuration for the split operation
 */
const config = {
  // Set to true to simulate the transaction, false to actually send it
  simulate: false,
  // Set to true to send the transaction, false to just output the unsigned transaction
  sendTx: true,
  // RPC endpoint
  rpcEndpoint: process.env.PRIVATE_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com",
  // Stake account to split
  stakeAccountPubkey: new PublicKey("GqJHeG9GbkVBAq58eFHFStL2oPdgXM7KLtmcbrB7gU4J"),
  // Amount to split in SOL
  splitAmount: 0.1,
  // Path to wallet keypair file
  walletPath: process.env.MARGINFI_WALLET || "./wallet.json",
};

async function main() {
  const connection = new Connection(config.rpcEndpoint, "confirmed");
  const wallet = loadKeypairFromFile(config.walletPath);

  console.log(`Splitting ${config.splitAmount} SOL from stake account: ${config.stakeAccountPubkey}`);
  console.log(`Using wallet: ${wallet.publicKey.toBase58()}`);

  // Create a new keypair for the split stake account
  const splitStakeAccount = Keypair.generate();
  console.log(`New split stake account: ${splitStakeAccount.publicKey.toBase58()}`);

  // Calculate lamports to split
  const splitLamports = Math.round(config.splitAmount * LAMPORTS_PER_SOL);
  console.log(`Splitting ${splitLamports} lamports (${config.splitAmount} SOL)`);

  // Get the rent exemption for stake accounts
  const rentExemption = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);
  console.log(`Rent exemption: ${rentExemption} lamports`);

  // Create the split instruction
  const splitInstruction = StakeProgram.split(
    {
      stakePubkey: config.stakeAccountPubkey,
      authorizedPubkey: wallet.publicKey,
      splitStakePubkey: splitStakeAccount.publicKey,
      lamports: splitLamports,
    },
    rentExemption
  );

  // Create the transaction
  const transaction = new Transaction();
  transaction.add(...splitInstruction.instructions);

  // Set fee payer
  transaction.feePayer = wallet.publicKey;

  if (config.simulate) {
    try {
      console.log("Simulating transaction...");
      const simulation = await connection.simulateTransaction(transaction);
      console.log("Simulation successful:", simulation);
      return;
    } catch (error) {
      console.error("Simulation failed:", error);
      return;
    }
  }

  if (config.sendTx) {
    try {
      console.log("Sending transaction...");
      const signature = await sendAndConfirmTransaction(connection, transaction, [wallet, splitStakeAccount]);
      console.log("✅ Split successful!");
      console.log(`Transaction signature: ${signature}`);
      console.log(`Split stake account: ${splitStakeAccount.publicKey.toBase58()}`);
      console.log(`Amount split: ${config.splitAmount} SOL`);
    } catch (error) {
      console.error("❌ Transaction failed:", error);
    }
  } else {
    // Output unsigned transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    const base58Transaction = serializedTransaction.toString("base64");
    console.log("Base64-encoded transaction:", base58Transaction);
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
