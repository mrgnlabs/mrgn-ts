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
import { loadKeypairFromFile, SINGLE_POOL_PROGRAM_ID } from "./utils";
import { findPoolAddress, findPoolStakeAddress, SinglePoolProgram } from "@solana/spl-single-pool-classic";

type Config = {
  VALIDATOR_VOTE_ACC: PublicKey;
};
const config: Config = {
  VALIDATOR_VOTE_ACC: new PublicKey("CooLbbZy5Xmdt7DiHPQ3ss2uRXawnTXXVgpMS8E8jDzr"),
};

async function main() {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  console.log("payer: " + wallet.publicKey);

  const poolKey = await findPoolAddress(SINGLE_POOL_PROGRAM_ID, config.VALIDATOR_VOTE_ACC);
  const poolStake = await findPoolStakeAddress(SINGLE_POOL_PROGRAM_ID, poolKey);

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
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
    ...(await SinglePoolProgram.initialize(provider.connection, config.VALIDATOR_VOTE_ACC, wallet.publicKey, true))
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
