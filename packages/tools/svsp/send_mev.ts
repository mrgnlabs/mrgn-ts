// Simulates sending MEV rewards to a svsp account
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
import { getStakeAccount } from "./stake-utils";

type Config = {
  /** The main PDA from which others are derived, not the actual stake account */
  SVSP_POOL: PublicKey;
  /** In lamports, e.g. 2 * LAMPORTS_PER_SOL = 2 SOL */
  AMOUNT: number;
};
const config: Config = {
  SVSP_POOL: new PublicKey("3jWfwA53i3wD55YbcngzQpe7QW39uW84YnsxN18b1Z9H"),
  AMOUNT: 1.1 * LAMPORTS_PER_SOL,
};

async function main() {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  console.log("payer: " + wallet.publicKey);

  const poolStake = await findPoolStakeAddress(SINGLE_POOL_PROGRAM_ID, config.SVSP_POOL);

  let tx = new Transaction();
  tx.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: poolStake,
      lamports: config.AMOUNT,
    })
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log(
    "sent fake mev: " +
      config.AMOUNT +
      " to stake account: " +
      poolStake +
      " which belongs to pool " +
      config.SVSP_POOL
  );

  const stakeAcc = await connection.getAccountInfo(poolStake);
  const stakeDecoded = getStakeAccount(stakeAcc.data);
  console.log("stake: " + stakeDecoded.stake.delegation.stake.toString());
  console.log("lamsp: " + stakeAcc.lamports);
}

main().catch((err) => {
  console.error(err);
});
