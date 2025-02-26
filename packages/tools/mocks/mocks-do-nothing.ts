// Runs once per group, before any staked banks can be init.
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Mocks } from "./mocks";
import mocksIdl from "./mocks.json";
import { loadKeypairFromFile } from "../scripts/utils";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

/**
 * If true, send the tx. If false, output the unsigned b58 tx to console.
 */
const sendTx = false;

type Config = {
  PROGRAM_ID: string;

  /** Multisig if testing a MS */
  PAYER: PublicKey;
};

const config: Config = {
  PROGRAM_ID: "HfCg2Re4BnZmQ7SzUcw3fhBtf1fqWmtMY1wov59VFrYs",
  PAYER: new PublicKey("J3oBkTkDXU3TcAggJEa3YeBZE5om5yNAdTtLVNXFD47"),
};

async function main() {
  mocksIdl.address = config.PROGRAM_ID;
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Mocks>(mocksIdl as Mocks, provider);

  const transaction = new Transaction();
  transaction.add(await program.methods.doNothing().accounts({ payer: config.PAYER }).instruction());

  if (sendTx) {
    try {
      const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  } else {
    transaction.feePayer = config.PAYER; // Set the fee payer to Squads wallet
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
