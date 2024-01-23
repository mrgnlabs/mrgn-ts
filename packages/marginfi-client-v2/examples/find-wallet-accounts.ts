import { getMarginfiClient } from "./utils";

async function main() {
  const client = await getMarginfiClient();

  const walletAccounts = await client.getMarginfiAccountsForAuthority(client.wallet.publicKey);

  if (walletAccounts.length === 0) {
    console.log("No accounts found");
  }

  for (const account of walletAccounts) {
    console.log("- " + account.address.toBase58());
  }
}

main();
