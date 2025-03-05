import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

import { loadKeypairFromFile } from "./utils";
import { assertI80F48Approx, assertKeysEqual } from "./softTests";

import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { Marginfi } from "../../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi.json";

const verbose = true;

type Config = {
  PROGRAM_ID: string;
  BANK: PublicKey;
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  BANK: new PublicKey("2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB"),
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
  let bank = await program.account.bank.fetch(config.BANK);

  console.log("group: " + bank.group);
}

main().catch((err) => {
  console.error(err);
});
