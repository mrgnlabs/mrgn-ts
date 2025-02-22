import { PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { BorshAccountsCoder } from "@coral-xyz/anchor/dist/cjs/coder/borsh";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

import { getDefaultYargsOptions, getConfig, getMarginfiProgram } from "../lib/config";
import { Environment } from "../lib/types";

dotenv.config();

type AccountCache = {
  timestamp: number;
  accounts: string[];
};

const CACHE_FILE = path.join(__dirname, "../account-cache.json");

async function main() {
  const argv = getDefaultYargsOptions().parseSync();

  const config = getConfig(argv.env as Environment, argv.group);
  const program = getMarginfiProgram(argv.env as Environment);

  console.log("\r\nFetching all marginfi accounts...");

  const marginfiAccounts = await program.provider.connection.getProgramAccounts(program.programId, {
    commitment: program.provider.connection.commitment,
    dataSlice: {
      offset: 0,
      length: 0,
    },
    filters: [
      {
        memcmp: {
          bytes: config.GROUP_ADDRESS,
          offset: 8,
        },
      },
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(new BorshAccountsCoder(program.idl).accountDiscriminator("marginfiAccount")),
        },
      },
    ],
  });

  const cache: AccountCache = {
    timestamp: Date.now(),
    accounts: marginfiAccounts.map((a) => a.pubkey.toString()),
  };

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

  console.log(`Cached ${marginfiAccounts.length} accounts to ${CACHE_FILE}`);
}

main().catch((err) => {
  console.error(err);
});
