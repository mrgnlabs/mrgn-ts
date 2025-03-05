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
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  GROUP: new PublicKey("6b9vFQjfYav2tVzns2cD21xU7E4z9LDnHTv9wjCJsknf"),
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
  let group = await program.account.marginfiGroup.fetch(config.GROUP);

  console.log("admin: " + group.admin);
}

main().catch((err) => {
  console.error(err);
});
