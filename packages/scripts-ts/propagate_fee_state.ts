import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { loadKeypairFromFile } from "./utils";
import { assertI80F48Approx, assertKeysEqual } from "./softTests";

const verbose = true;

type Config = {
  PROGRAM_ID: string;
  GROUP_KEYS: PublicKey[];
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  GROUP_KEYS: [
    new PublicKey("FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo"),
    // Up to ~30 groups per script execution
  ],
};

const deriveGlobalFeeState = (programId: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("feestate", "utf-8")],
    programId
  );
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
  const transaction = new Transaction();
  for (const groupKey of config.GROUP_KEYS) {
    const ix = await program.methods
      .propagateFeeState()
      .accounts({
        // feeState: derived automatically from static PDA
        marginfiGroup: groupKey,
      })
      .instruction();

    transaction.add(ix);
  }

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  const [feeStateKey] = deriveGlobalFeeState(program.programId);
  const feeState = await program.account.feeState.fetch(feeStateKey);
  const groups = await program.account.marginfiGroup.fetchMultiple(config.GROUP_KEYS);

  if (verbose) {
    console.log("fee state: " + feeStateKey);
  }
  for (let i = 0; i < config.GROUP_KEYS.length; i++) {
    const group = groups[i];
    const cache = group.feeStateCache;

    if (verbose) {
      console.log("[" + i + "] checking group: " + config.GROUP_KEYS[i]);
    }

    assertKeysEqual(feeState.globalFeeWallet, cache.globalFeeWallet);
    assertI80F48Approx(feeState.programFeeFixed, cache.programFeeFixed);
    assertI80F48Approx(feeState.programFeeRate, cache.programFeeRate);

    if (verbose) {
      console.log("   " + config.GROUP_KEYS[i] + " ok");
    }
  }
}

main().catch((err) => {
  console.error(err);
});
