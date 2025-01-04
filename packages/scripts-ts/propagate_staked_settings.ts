import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { DEFAULT_API_URL, loadEnvFile, loadKeypairFromFile } from "./utils";
import { assertI80F48Approx, assertKeysEqual } from "./softTests";

type Config = {
  PROGRAM_ID: string;
  GROUP: PublicKey;
  BANK_KEYS: PublicKey[];
  ORACLE?: PublicKey;
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  GROUP: new PublicKey("FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo"),
  BANK_KEYS: [
    new PublicKey("3jt43usVm7qL1N5qPvbzYHWQRxamPCRhri4CxwDrf6aL"),
    // Up to ~30 banks per script execution
  ],
  // only required if changing the oracle...
  ORACLE: undefined,
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  const connection = new Connection(apiUrl, "confirmed");
  // Permissionless, any wallet can do it...
  const wallet = loadKeypairFromFile(process.env.HOME + "/.config/solana/id.json");
  console.log("wallet: " + wallet.publicKey);

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(
    // @ts-ignore
    marginfiIdl as Marginfi,
    provider
  );
  const transaction = new Transaction();
  let [stakedSettingsKey] = deriveStakedSettings(program.programId, config.GROUP);
  for (const bankKey of config.BANK_KEYS) {
    const ix = await program.methods
      .propagateStakedSettings()
      .accounts({
        // feeState: derived automatically from static PDA
        stakedSettings: stakedSettingsKey,
        bank: bankKey,
      })
      // TODO oracle in remaining accounts as needed...
      .instruction();

    transaction.add(ix);
  }

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

// TODO remove after package updates
const deriveStakedSettings = (programId: PublicKey, group: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("staked_settings", "utf-8"), group.toBuffer()], programId);
};

main().catch((err) => {
  console.error(err);
});
