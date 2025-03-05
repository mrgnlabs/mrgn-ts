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
import { createStakeAccount, delegateStake } from "./stake-utils";

type Config = {
  VALIDATOR_VOTE_ACC: PublicKey;
  STAKE_ACC: PublicKey;
};
const config: Config = {
  VALIDATOR_VOTE_ACC: new PublicKey("9us7TgKiJSz5fqT5Eb8ghV6b2C87zxv2VbXUWbbK5GRJ"),
  STAKE_ACC: new PublicKey("7k5fKNS1jPxuWf9cvaSiFqvpJvDgXLTwUpCi3UQC97P2"),
};

async function main() {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  console.log("payer: " + wallet.publicKey);

  let delegateTx = delegateStake(wallet.publicKey, config.STAKE_ACC, config.VALIDATOR_VOTE_ACC);

  try {
    const signature = await sendAndConfirmTransaction(connection, delegateTx, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("Delegated " + config.STAKE_ACC + " to " + config.VALIDATOR_VOTE_ACC);
}

main().catch((err) => {
  console.error(err);
});
