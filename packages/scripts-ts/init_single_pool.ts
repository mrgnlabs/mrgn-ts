// NOTE: you will need to change package resolution or overrides to use `"@solana/web3.js":
// "^1.91.6"`, unless Solana foundation updates this...
import { Connection, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { loadKeypairFromFile, SINGLE_POOL_PROGRAM_ID } from "./utils";
import { findPoolAddress, SinglePoolProgram } from "@solana/spl-single-pool-classic";

type Config = {
  VALIDATOR_VOTE_ACC: PublicKey;
};
const config: Config = {
  VALIDATOR_VOTE_ACC: new PublicKey("CooLbbZy5Xmdt7DiHPQ3ss2uRXawnTXXVgpMS8E8jDzr"),
};

async function main() {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/.config/solana/id.json");

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  let tx = await SinglePoolProgram.initialize(provider.connection, config.VALIDATOR_VOTE_ACC, wallet.publicKey, true);

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("Transaction signature:", signature);
    const poolKey = await findPoolAddress(SINGLE_POOL_PROGRAM_ID, config.VALIDATOR_VOTE_ACC);
    console.log("Pool key: " + poolKey);
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

main().catch((err) => {
  console.error(err);
});
