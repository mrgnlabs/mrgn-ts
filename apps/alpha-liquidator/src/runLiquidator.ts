import { Jupiter } from "@jup-ag/core";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { isMainThread, Worker } from "worker_threads";
import { runGetAccountInfosProcess } from "./getAccountInfosProcess";
import { ammsToExclude } from "./ammsToExclude";
import { connection } from "./utils/connection";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { getConfig, MarginfiAccount, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { parseEnvConfig } from "./config";
import { Liquidator } from "./liquidator";
import { delayedShutdown, getLogger, initTelemetry } from "./utils/logger";

initTelemetry("run-liquidator");
const logger = getLogger();

const env_config = parseEnvConfig();

async function start() {
  logger.debug("Jupiter initializing");

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

  const accountToAmmIdsMap = jupiter.getAccountToAmmIdsMap();
  const ammIdToAmmMap = jupiter.getAmmIdToAmmMap();

  logger.debug("Fetching initial blockhash");
  let blockhashWithExpiryBlockHeight = await connection.getLatestBlockhash("confirmed");

  // each blockhash can last about 1 minute, we refresh every second
  setInterval(async () => {
    blockhashWithExpiryBlockHeight = await connection.getLatestBlockhash("confirmed");
  }, 1000);

  const store = {
    contextSlot: 0,
    accountInfos: new Map<string, AccountInfo<Buffer>>(),
  };

  logger.debug("Starting worker");
  const worker = new Worker(__filename);
  worker.on("error", (err) => {
    logger.error(err);
    delayedShutdown();
  });
  worker.on("exit", () => {
    logger.debug("Worker exited");
    delayedShutdown();
  });

  // wait until the worker is ready`
  let resolved = false;
  await new Promise<void>((resolve) => {
    if (env_config.IS_DEV) resolve(); // The fetcher does not run in local dev mode
    worker.on(
      "message",
      ({
         type,
         contextSlot,
         accountInfosMap,
       }: {
        type: string;
        contextSlot: number;
        accountInfosMap: Map<string, AccountInfo<Buffer>>;
      }) => {
        store.contextSlot = contextSlot;

        // We are only updating the contextSlot.
        if (type === "contextSlot") {
          return;
        }

        const ammsIdsToUpdate = new Set<string>();

        accountInfosMap.forEach((value, key) => {
          const ammIds = accountToAmmIdsMap.get(key);
          ammIds?.forEach((ammId) => {
            ammsIdsToUpdate.add(ammId);
          });

          const accountInfo = store.accountInfos.get(key);

          // Hack to turn back the Uint8Array into a buffer so nothing unexpected occurs downstream
          const newData = Buffer.from(value.data);

          if (accountInfo) {
            accountInfo.data = newData;
            store.accountInfos.set(key, accountInfo);
          } else {
            value.data = newData;
            value.owner = new PublicKey(value.owner);
            store.accountInfos.set(key, value);
          }
        });

        // For most amms we would receive multiple accounts at once, we should update only once
        ammsIdsToUpdate.forEach((ammId) => {
          const amm = ammIdToAmmMap.get(ammId);

          if (amm) {
            try {
              amm.update(store.accountInfos);
            } catch (e) {
              logger.error(`Failed to update amm ${amm.id}`);
              logger.error(e);
            }
            if (amm.hasDynamicAccounts) {
              amm.getAccountsForUpdate().forEach((pk) => {
                const account = pk.toString();
                const ammIds = accountToAmmIdsMap.get(account) || new Set();
                ammIds.add(amm.id);
                accountToAmmIdsMap.set(account, ammIds);
              });
            }
          }
        });

        if (!resolved) {
          resolve();
        }
      },
    );
  });

  const config = getConfig(env_config.MRGN_ENV);
  const client = await MarginfiClient.fetch(config, wallet, connection);

  const liquidatorAccount = await MarginfiAccount.fetch(env_config.LIQUIDATOR_PK, client);
  const liquidator = new Liquidator(connection, liquidatorAccount, client, wallet, jupiter, env_config.MARGINFI_ACCOUNT_WHITELIST, env_config.MARGINFI_ACCOUNT_BLACKLIST);
  await liquidator.start();
}

if (isMainThread) {
  logger.debug("Starting liquidator main thread");
  start().catch(e => {
    logger.error(e);
    delayedShutdown();
  });
} else {
  runGetAccountInfosProcess().catch(e => {
    logger.error(e);
    delayedShutdown();
  });
}
