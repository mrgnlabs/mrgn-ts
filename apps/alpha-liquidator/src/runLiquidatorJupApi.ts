import { Jupiter } from "@jup-ag/core";
import { ammsToExclude } from "./ammsToExclude";
import { connection } from "./utils/connection";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { getConfig, MarginfiAccountWrapper, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { env_config } from "./config";
import { Liquidator } from "./liquidator";

async function start() {
  console.log("Initializing");
  const wallet = new NodeWallet(env_config.WALLET_KEYPAIR);

  const config = getConfig(env_config.MRGN_ENV);
  const client = await MarginfiClient.fetch(config, wallet, connection);

  const liquidatorAccount = await MarginfiAccountWrapper.fetch(env_config.LIQUIDATOR_PK, client);
  const liquidator = new Liquidator(
    connection,
    liquidatorAccount,
    client,
    wallet,
    env_config.MARGINFI_ACCOUNT_WHITELIST,
    env_config.MARGINFI_ACCOUNT_BLACKLIST
  );
  await liquidator.start();
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
