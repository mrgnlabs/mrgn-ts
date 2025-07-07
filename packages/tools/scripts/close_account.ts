import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Marginfi } from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi-types_0.1.3";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi_0.1.3.json";
import { loadKeypairFromFile } from "./utils";

type Config = {
  PROGRAM_ID: string;
  ACCOUNT: PublicKey;
  FEE_PAYER: PublicKey;
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  ACCOUNT: new PublicKey("EjaNvWcsPxVoKkADhpMre433bhdeU8uPgtgYPLsYKCjH"),
  FEE_PAYER: new PublicKey("CCzftmCoJxWdEeKxsn9AAiHFZ2QMbgqYqrRA7tRbfdnF"),
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/.config/solana/id.json");

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(
    // @ts-ignore
    marginfiIdl as Marginfi,
    provider
  );
  const transaction = new Transaction().add(
    await program.methods
      .marginfiAccountClose()
      .accounts({
        marginfiAccount: config.ACCOUNT,
        feePayer: config.FEE_PAYER,
      })
      .instruction()
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

main().catch((err) => {
  console.error(err);
});
