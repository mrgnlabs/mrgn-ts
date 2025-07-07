import { AccountMeta, Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Marginfi } from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi-types_0.1.3";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi_0.1.3.json";
import { loadKeypairFromFile } from "./utils";

type Config = {
  PROGRAM_ID: string;
  ACCOUNT: PublicKey;
  BANK: PublicKey;
  REMAINING: PublicKey[];
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  ACCOUNT: new PublicKey("8NMP5D96bgBd5QYcvVN6GuUqVf9psyjBT2qex64e2QXy"),
  BANK: new PublicKey("8VTWf7QoHirWPHiDXBG3QkKQig7wBGd4sDqQNU5CSuHA"), //new PublicKey("5n125hjbaeH4Ft5UrgFN3Tkv6qG5RNhfNLTRZpddkRag"),
  REMAINING: [
    new PublicKey("8VTWf7QoHirWPHiDXBG3QkKQig7wBGd4sDqQNU5CSuHA"), // usdc bank
    new PublicKey("9km7RzRAuWPPeJGk9DNWTAjA8V5Xnm1o9CdUQuDG1654"), // usdc oracle
  ],
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(
    // @ts-ignore
    marginfiIdl as Marginfi,
    provider
  );
  const oracleMeta: AccountMeta[] = config.REMAINING.map((pubkey) => ({
    pubkey,
    isSigner: false,
    isWritable: false,
  }));
  const transaction = new Transaction().add(
    await program.methods
      .lendingAccountCloseBalance()
      .accounts({
        marginfiAccount: config.ACCOUNT,
        bank: config.BANK,
      })
      .remainingAccounts(oracleMeta)
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
