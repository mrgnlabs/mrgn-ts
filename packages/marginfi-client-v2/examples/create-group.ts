import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { getMarginfiClient } from "./utils";

async function main() {
  const client = await getMarginfiClient();

  console.log("Creating group for authority:", shortenAddress(client.wallet.publicKey));

  const group = await client.createMarginfiGroup();

  console.log(`Created group with address: ${group.toBase58()}`);
}

main().catch((e) => console.log(e));
