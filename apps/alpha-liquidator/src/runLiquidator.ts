import { Jupiter } from "@jup-ag/core";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { isMainThread, Worker } from "worker_threads";
import { runGetAccountInfosProcess } from "./getAccountInfosProcess";
import { ammsToExclude } from "./ammsToExclude";
import { connection } from "./utils/connection";
import { loadKeypair, NodeWallet } from "@mrgnlabs/mrgn-common";
import { MarginfiAccount, Environment, getConfig, MarginfiClient, MarginfiGroup } from "@mrgnlabs/marginfi-client-v2";
import { env_config } from "./config";
import { Liquidator } from "./liquidator";

const debug = require("debug")("mfi:liq-scheduler");

async function start() {
  debug("Jupiter initializing");

  const wallet = new NodeWallet(loadKeypair(env_config.KEYPAIR_PATH));

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

  debug("Fetching initial blockhash");
  let blockhashWithExpiryBlockHeight = await connection.getLatestBlockhash("confirmed");

  // each blockhash can last about 1 minute, we refresh every second
  setInterval(async () => {
    blockhashWithExpiryBlockHeight = await connection.getLatestBlockhash("confirmed");
  }, 1000);

  const store = {
    contextSlot: 0,
    accountInfos: new Map<string, AccountInfo<Buffer>>(),
  };

  debug("Starting worker");
  const worker = new Worker(__filename);

  worker.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });

  worker.on("exit", () => {
    debug("worker exited");
    process.exit(1);
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
              console.error(`Failed to update amm ${amm.id}, reason ${e}`);
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
      }
    );
  });

  const config = getConfig(env_config.MRGN_ENV as Environment);
  const liquidatorPk = new PublicKey(env_config.LIQUIDATOR_PK!);
  const client = await MarginfiClient.fetch(config, wallet, connection);
  const group = await MarginfiGroup.fetch(config, client.program);

  const liquidatorAccount = await MarginfiAccount.fetch(liquidatorPk, client);
  const liquidator = new Liquidator(connection, liquidatorAccount, group, client, wallet, jupiter);
  await liquidator.start();
}

if (isMainThread) {
  start().catch(() => {
    process.exit(1);
  });
} else {
  runGetAccountInfosProcess().catch(() => {
    process.exit(1);
  });
}
