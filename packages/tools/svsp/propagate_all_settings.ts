// This propagates the fee state to all active staked collateral banks.

// TODO add a LUT and send these all in one tx to avoid burning so many tx fees.
import { Connection, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { DEFAULT_API_URL, loadEnvFile, loadKeypairFromFile } from "../scripts/utils";
import { Marginfi } from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi.json";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

type Config = {
  PROGRAM_ID: string;
  GROUP: PublicKey;
};

const config: Config = {
  PROGRAM_ID: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  GROUP: new PublicKey("4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8"),
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  const connection = new Connection(apiUrl, "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  console.log("payer: " + wallet.publicKey);

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(
    // @ts-ignore
    marginfiIdl as Marginfi,
    provider
  );

  const jsonUrl = "https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache.json";
  const response = await fetch(jsonUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${response.statusText}`);
  }
  const pools: PoolEntry[] = (await response.json()) as PoolEntry[];
  // Or read it locally....
  //   const poolsJson = fs.readFileSync(path.join(__dirname, "svsp_pools.json"), "utf8");
  //   const pools: PoolEntry[] = JSON.parse(poolsJson);
  console.log("read " + pools.length + " pools");
  console.log("");

  for (let i = 0; i < pools.length; i++) {
    const bank = new PublicKey(pools[i].bankAddress);

    let [stakedSettingsKey] = deriveStakedSettings(program.programId, config.GROUP);
    let tx = new Transaction();
    const ix = await program.methods
      .propagateStakedSettings()
      .accounts({
        // feeState: derived automatically from static PDA
        stakedSettings: stakedSettingsKey,
        bank: bank,
      })
      // TODO oracle in remaining accounts as needed...
      .instruction();

    tx.add(ix);

    try {
      const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Transaction failed:", error);
    }

    console.log("Cranked settings for: " + bank);
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
});

// TODO remove after package updates
const deriveStakedSettings = (programId: PublicKey, group: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("staked_settings", "utf-8"), group.toBuffer()], programId);
};

/**
 * JSON file format of our staked banks endpoint
 * (https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache.json)
 */
type PoolEntry = {
  bankAddress: string;
  validatorVoteAccount: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
};
