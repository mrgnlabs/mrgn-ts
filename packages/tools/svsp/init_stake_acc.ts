import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { loadKeypairFromFile, SINGLE_POOL_PROGRAM_ID } from "../scripts/utils";
import { findPoolAddress, findPoolStakeAddress, SinglePoolProgram } from "@solana/spl-single-pool-classic";
import { createStakeAccount } from "./stake-utils";

type Config = {
  VALIDATOR_VOTE_ACC: PublicKey;
  /** Must be at least 1.1 SOL (ish). In lamports, e.g. 2 * LAMPORTS_PER_SOL = 2 SOL */
  AMOUNT: number;
};
const config: Config = {
  VALIDATOR_VOTE_ACC: new PublicKey("HTyEUBcX2WTcgybpSG6qhkkn11QGWo7xfFWriFcYFku5"),
  AMOUNT: 2 * LAMPORTS_PER_SOL,
};

async function main() {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  console.log("payer: " + wallet.publicKey);

  let { createTx, stakeAccountKeypair } = createStakeAccount(wallet.publicKey, config.AMOUNT);

  try {
    const signature = await sendAndConfirmTransaction(connection, createTx, [wallet, stakeAccountKeypair]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("Stake account: " + stakeAccountKeypair.publicKey);
}

main().catch((err) => {
  console.error(err);
});
