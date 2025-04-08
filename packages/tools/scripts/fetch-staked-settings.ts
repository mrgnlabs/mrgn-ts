import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

import { loadKeypairFromFile } from "./utils";
import { assertI80F48Approx, assertKeysEqual } from "./softTests";

import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { Marginfi } from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi.json";

const verbose = true;

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
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/.config/solana/id.json");

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(marginfiIdl as Marginfi, provider);
  let [stakedSettingsKey] = deriveStakedSettings(program.programId, config.GROUP);

  let settings = await program.account.stakedSettings.fetch(stakedSettingsKey);

  console.log("key: " + settings.key);
  console.log("group: " + settings.marginfiGroup);
  console.log("weight init: " + wrappedI80F48toBigNumber(settings.assetWeightInit));
  console.log("weight maint: " + wrappedI80F48toBigNumber(settings.assetWeightMaint));
  console.log("deposit limit: " + settings.depositLimit.toNumber());
  console.log("oracle: " + settings.oracle);
  console.log("oracle age: " + settings.oracleMaxAge);
  console.log("init limit: " + settings.totalAssetValueInitLimit);
  console.log("risk tier: " + JSON.stringify(settings.riskTier));
}

// TODO remove after package updates
const deriveStakedSettings = (programId: PublicKey, group: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("staked_settings", "utf-8"), group.toBuffer()], programId);
};

main().catch((err) => {
  console.error(err);
});
