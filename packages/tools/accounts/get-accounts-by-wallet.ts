import { getDefaultYargsOptions, getConfig, getMarginfiProgram } from "../lib/config";
import { Environment } from "../lib/types";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const argv = getDefaultYargsOptions()
    .option("wallet", {
      alias: "w",
      type: "string",
      demandOption: true,
      description: "Wallet public key",
    })
    .parseSync();

  const walletPubkey = new PublicKey(argv.wallet);
  const program = getMarginfiProgram(argv.env as Environment);
  const config = getConfig(argv.env as Environment, argv.group);

  const marginfiAccounts = (
    await program.account.marginfiAccount.all([
      {
        memcmp: {
          bytes: config.GROUP_ADDRESS,
          offset: 8,
        },
      },
      {
        memcmp: {
          bytes: walletPubkey.toBase58(),
          offset: 8 + 32,
        },
      },
    ])
  ).map((a) => ({
    Account: a.publicKey.toBase58(),
  }));

  console.log(`\r\nFound ${marginfiAccounts.length} accounts for wallet ${walletPubkey.toBase58()}`);

  console.table(marginfiAccounts);
}

main();
