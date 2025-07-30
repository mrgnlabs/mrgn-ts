import { MarginfiClient, getConfig } from "@mrgnlabs/marginfi-client-v2";
import { Connection, PublicKey } from "@solana/web3.js";

async function main() {
  const config = getConfig("production");
  const wallet = {
    publicKey: new PublicKey("CBTHnBs4x94sA5aPfjs8Znjb5r4qBkfZJ3yv4CuDoCLh"),
  } as any;

  const connection = new Connection(
    "https://rpc.ironforge.network/mainnet?apiKey=01J978CQGKZC2P027TQH0THEY5",
    "confirmed"
  );

  const test = await MarginfiClient.fetch(config, wallet, connection);

  console.log(test);
}
main();
