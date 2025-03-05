// NOTE: you will need to change package resolution or overrides to use `"@solana/web3.js":
// "^1.91.6"`, unless Solana foundation updates this...
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

type Config = {
  VALIDATOR_VOTE_ACC: PublicKey;
};
const config: Config = {
  VALIDATOR_VOTE_ACC: new PublicKey("9us7TgKiJSz5fqT5Eb8ghV6b2C87zxv2VbXUWbbK5GRJ"),
};

async function main() {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  console.log("payer: " + wallet.publicKey);

  const poolKey = await findPoolAddress(SINGLE_POOL_PROGRAM_ID, config.VALIDATOR_VOTE_ACC);
  const poolStake = await findPoolStakeAddress(SINGLE_POOL_PROGRAM_ID, poolKey);

  let tx = new Transaction();
  tx.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: poolStake,
      // TODO
      /*
        NO IDEA HOW MUCH IS ACTUALLY NEEDED HERE, SOLANA'S REFERENCE IMPLEMENTATION DOESN'T
        SEND ENOUGH, BUT THIS IS LIKELY TOO MUCH
      */
      lamports: LAMPORTS_PER_SOL * 1.1,
    })
  );

  tx.add(
    ...(await SinglePoolProgram.initialize(connection, config.VALIDATOR_VOTE_ACC, wallet.publicKey, true))
      .instructions
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("pool key: " + poolKey);
}

main().catch((err) => {
  console.error(err);
});
