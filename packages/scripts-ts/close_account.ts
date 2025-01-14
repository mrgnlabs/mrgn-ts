import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { loadKeypairFromFile } from "./utils";

type Config = {
  PROGRAM_ID: string;
  ACCOUNT_KEY: PublicKey;
  AUTHORITY_KEY: PublicKey;
  FEE_PAYER_KEY: PublicKey;
};

const config: Config = {
  PROGRAM_ID: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  // Fill your marginfi account key here....
  ACCOUNT_KEY: new PublicKey("stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct"),
  // Fill your wallet here...
  AUTHORITY_KEY: new PublicKey("stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct"),
  // Fill your account to get the rent here...
  FEE_PAYER_KEY: new PublicKey("stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct"),
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
        marginfiAccount: config.ACCOUNT_KEY,
        feePayer: config.FEE_PAYER_KEY,
        authority: config.AUTHORITY_KEY,
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
