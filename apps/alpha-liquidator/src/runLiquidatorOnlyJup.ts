import { Jupiter } from "@jup-ag/core";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { isMainThread, Worker } from "worker_threads";
import { runGetAccountInfosProcess } from "./getAccountInfosProcess";
import { ammsToExclude } from "./ammsToExclude";
import { connection } from "./utils/connection";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { getConfig, MarginfiAccount, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { env_config } from "./config";
import { Liquidator } from "./liquidator";

async function start() {
  console.log("Initializing");
  const wallet = new NodeWallet(env_config.WALLET_KEYPAIR);

  const jupiter = await Jupiter.load({
    connection: connection,
    cluster: "mainnet-beta",
    routeCacheDuration: env_config.IS_DEV ? 5_000 : -1,
    restrictIntermediateTokens: true,
    ammsToExclude,
    usePreloadedAddressLookupTableCache: true,
    user: wallet.payer,
  });

  const config = getConfig(env_config.MRGN_ENV);
  const client = await MarginfiClient.fetch(config, wallet, connection);

  const liquidatorAccount = await MarginfiAccount.fetch(env_config.LIQUIDATOR_PK, client);
  const liquidator = new Liquidator(
    connection,
    liquidatorAccount,
    client,
    wallet,
    jupiter,
    env_config.MARGINFI_ACCOUNT_WHITELIST,
    env_config.MARGINFI_ACCOUNT_BLACKLIST
  );
  await liquidator.start();
}

start().catch((e) => {
  console.log(e);
  process.exit(1);
});
