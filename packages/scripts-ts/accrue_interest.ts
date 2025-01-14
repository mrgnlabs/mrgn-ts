import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { loadKeypairFromFile } from "./utils";

type Config = {
  PROGRAM_ID: string;
  BANK_KEY: PublicKey;
  GROUP_KEY: PublicKey;
};
const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  BANK_KEY: new PublicKey("Fe5QkKPVAh629UPP5aJ8sDZu8HTfe6M26jDQkKyXVhoA"),
  GROUP_KEY: new PublicKey("FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo"),
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection(
    "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
  const wallet = loadKeypairFromFile(
    process.env.HOME + "/.config/solana/id.json"
  );

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  const program: Program<Marginfi> = new Program(
    // @ts-ignore
    marginfiIdl as Marginfi,
    provider
  );
  const transaction = new Transaction().add(
    await program.methods
      .lendingPoolAccrueBankInterest()
      .accounts({
        bank: config.BANK_KEY,
        marginfiGroup: config.GROUP_KEY,
      })
      .instruction()
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      wallet,
    ]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

main().catch((err) => {
  console.error(err);
});