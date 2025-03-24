import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

import { loadKeypairFromFile } from "./utils";
import { assertI80F48Approx, assertKeysEqual } from "./softTests";

import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { Marginfi } from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi-types_0.1.2";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi.json";

const verbose = true;

type Config = {
  PROGRAM_ID: string;
  ACCOUNT: PublicKey;
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  ACCOUNT: new PublicKey("E3uJyxW232EQAVZ9P9V6CFkxzjqqVdbh8XvUmxtZdGUt"),
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
  let acc = await program.account.marginfiAccount.fetch(config.ACCOUNT);
  let balances = acc.lendingAccount.balances;
  let activeBalances = [];
  for (let i = 0; i < balances.length; i++) {
    if (balances[i].active === false) continue; // Skip inactive balances

    activeBalances.push({
      "Bank PK": balances[i].bankPk.toString(),
      "Asset Tag": balances[i].bankAssetTag,
      "Liability Shares": formatNumber(wrappedI80F48toBigNumber(balances[i].liabilityShares)),
      "Asset Shares": formatNumber(wrappedI80F48toBigNumber(balances[i].assetShares)),
      "Emissions Outstanding": formatNumber(wrappedI80F48toBigNumber(balances[i].emissionsOutstanding)),
      "Last Update": balances[i].lastUpdate.toString(),
    });
  }

  function formatNumber(num) {
    const number = parseFloat(num).toFixed(4);
    return number === "0.0000" ? "-" : number;
  }

  // Display the active balances as a formatted table
  console.table(activeBalances);
}

main().catch((err) => {
  console.error(err);
});
