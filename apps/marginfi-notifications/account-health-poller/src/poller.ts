import { connection } from "./utils/connection";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { getConfig, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { env_config } from "./config";

async function start() {
  console.log("Initializing");
  const wallet = new NodeWallet(env_config.WALLET_KEYPAIR!);

  const config = getConfig(env_config.MRGN_ENV!);
  const client = await MarginfiClient.fetch(config, wallet, connection);

  console.log("Ready to go...");
}

async function startWithRestart() {
  try {
    await start();
  } catch (e) {
    console.log(e);
    console.log("Restarting due to crash...");
    startWithRestart();
  }
}

startWithRestart();
