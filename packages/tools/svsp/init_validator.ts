// Note: You probably don't want a test validator on mainnet, but if you're sure you do....
import {
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  VoteInit,
  VoteProgram,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { loadKeypairFromFile } from "../scripts/utils";

type Config = {
  /**
   * 0 to 100
   */
  COMISSION: number;
};
const config: Config = {
  COMISSION: 0,
};

async function main() {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  let authorizedVoter = wallet.publicKey;
  let authorizedWithdrawer = wallet.publicKey;
  console.log("payer, authorized voted and withdrawer: " + wallet.publicKey);

  const voteAccount = Keypair.generate();
  const node = Keypair.generate();

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  const tx = new Transaction().add(
    // Create the vote account
    SystemProgram.createAccount({
      fromPubkey: authorizedVoter,
      newAccountPubkey: voteAccount.publicKey,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(VoteProgram.space),
      space: VoteProgram.space,
      programId: VoteProgram.programId,
    }),
    // Initialize the vote account
    VoteProgram.initializeAccount({
      votePubkey: voteAccount.publicKey,
      nodePubkey: node.publicKey,
      voteInit: new VoteInit(node.publicKey, authorizedVoter, authorizedWithdrawer, config.COMISSION),
    })
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet, voteAccount, node]);
    console.log("Transaction signature:", signature);
    console.log("vote account: " + voteAccount.publicKey);
    console.log("node: " + node.publicKey);
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

main().catch((err) => {
  console.error(err);
});
