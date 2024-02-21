import { PublicKey } from "@solana/web3.js";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { getConfig, MarginfiAccountWrapper, MarginfiClient, MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { env_config, captureException } from "./config";
import { connection } from "./utils/connection";
import { loadBankMetadatas } from "./utils/bankMetadata";
import { chunkedGetRawMultipleAccountInfos } from "./utils/chunks";

let client: MarginfiClient;
let accountInfos: Map<PublicKey, MarginfiAccountWrapper> = new Map();

async function start() {
  console.log("Initializing");
  const wallet = new NodeWallet(env_config.WALLET_KEYPAIR!);

  const config = getConfig(env_config.MRGN_ENV!);
  client = await MarginfiClient.fetch(config, wallet, connection);

  console.log("Starting acount health poller");
  console.log("Program id: %s", client.program.programId);
  console.log("Group: %s", client.groupAddress);

  let bankMetadataMap = await loadBankMetadatas();

  setInterval(async () => {
    try {
      bankMetadataMap = await loadBankMetadatas();
      console.log(bankMetadataMap);
    } catch (e) {
      console.error("Failed to refresh bank metadata");
    }
  }, 10 * 60 * 1000); // refresh cache every 10 minutes

  await loadAllMarginfiAccounts();
  await startWebsocketAccountUpdater();
  await mainLoop();
}

async function mainLoop() {
  const debug = getDebugLogger("main-loop");
  drawSpinner("Scanning");
  while (true) {
    try {
      reload();
      while (true) {
        debug("Started main loop iteration");

        const allAccounts = Array.from(accountInfos.values());
        const targetAccounts = allAccounts.filter((account) => {
          if (env_config.MARGINFI_ACCOUNT_WHITELIST) {
            return (
              env_config.MARGINFI_ACCOUNT_WHITELIST.find((whitelistedAddress) =>
                whitelistedAddress.equals(account.address)
              ) !== undefined
            );
          }
          return true;
        });

        debug("Found %s accounts in total", allAccounts.length);
        debug("Monitoring %s accounts", targetAccounts.length);

        await Promise.all(
          targetAccounts.map(async (account) => {
            debug("Scanning account: %s", account.address.toBase58());
            debug("Account authority: %s", account.authority.toBase58());

            const maintenanceComponentsWithBiasAndWeighted = account.computeHealthComponents(
              MarginRequirementType.Maintenance
            );

            const healthFactor = maintenanceComponentsWithBiasAndWeighted.assets.isZero()
              ? 1
              : maintenanceComponentsWithBiasAndWeighted.assets
                  .minus(maintenanceComponentsWithBiasAndWeighted.liabilities)
                  .dividedBy(maintenanceComponentsWithBiasAndWeighted.assets)
                  .toNumber();
            const healthFactorPercentage = Math.floor(healthFactor * 100);
            const triggerNotification = healthFactor <= env_config.HEALTH_FACTOR_THRESHOLD;

            debug("Health Factor: %d%", healthFactorPercentage);
            debug("Trigger notification: %s", triggerNotification ? "Yes" : "No");

            if (!triggerNotification) return;

            process.stdout.cursorTo(0);
            process.stdout.write("Triggering new notifications webhook\r\n");
            console.log("  - Wallet: ", account.authority.toBase58());
            console.log("  - Health: ", healthFactor);

            const res = await fetch(env_config.NOTIFICATIONS_WEBHOOK_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                wallet: account.authority.toBase58(),
                health: healthFactor,
              }),
            });

            const data = await res.json();

            process.stdout.cursorTo(0);
            process.stdout.write("  - Response: ");
            console.log(data.error || data);
          })
        );

        debug("Ending main loop iteration");
        await sleep(env_config.SLEEP_INTERVAL_SECONDS * 1000);
        reload();
      }
    } catch (e) {
      console.error(e);
      captureException(e);
      await sleep(env_config.SLEEP_INTERVAL_SECONDS * 1000);
    }
  }
}

async function loadAllMarginfiAccounts() {
  console.log("Loading data, this may take a moment...");
  const debug = getDebugLogger("load-all-marginfi-accounts");
  debug("Loading all Marginfi accounts");
  let allKeys = [];

  // If whitelist is set, filter out all accounts that are not in the whitelist
  if (env_config.MARGINFI_ACCOUNT_WHITELIST) {
    allKeys = env_config.MARGINFI_ACCOUNT_WHITELIST;
  } else {
    allKeys = await client.getAllMarginfiAccountAddresses();
  }

  debug("Retrieved all Marginfi account addresses, found: %d", allKeys.length);
  const [slot, ais] = await chunkedGetRawMultipleAccountInfos(
    connection,
    allKeys.map((k) => k.toBase58()),
    16 * 64,
    64
  );
  debug("Received account information for slot %d, got: %d accounts", slot, ais.size);

  const totalAccounts = ais.size;
  let processedAccounts = 0;
  for (const [key, accountInfo] of ais) {
    const pubkey = new PublicKey(key);
    const account = MarginfiAccountWrapper.fromAccountDataRaw(pubkey, client, accountInfo.data);
    accountInfos.set(pubkey, account);

    processedAccounts++;
    if (processedAccounts % 5000 === 0) {
      const progress = ((processedAccounts / totalAccounts) * 100).toFixed(2);
      debug("Processed %d accounts out of %d (%s%%)", processedAccounts, totalAccounts, progress);
    }
  }

  console.log("Finished loading all Marginfi accounts");
}

async function startWebsocketAccountUpdater() {
  const debug = getDebugLogger("start-websocket-account-updater");
  debug("Starting websocket account updater");
  /// Start a websocket that updates the accounts.
  let wsConnection = 0;

  const fn = () => {
    if (wsConnection != 0) {
      debug("Resetting websocket connection");
      connection.removeAccountChangeListener(wsConnection);
    }

    debug("Starting websocket connection");
    wsConnection = connection.onProgramAccountChange(client.program.programId, (info) => {
      const pubkey = info.accountId;
      const accountInfo = info.accountInfo;

      if (accountInfo.data.length !== client.program.account.marginfiAccount.size) {
        return;
      }

      try {
        const account = MarginfiAccountWrapper.fromAccountDataRaw(pubkey, client, accountInfo.data);
        accountInfos.set(pubkey, account);
      } catch (error) {
        debug("Failed to decode Marginfi account for public key: %s, Error: %s", pubkey.toBase58(), error);
      }
    });
  };

  setInterval(() => fn, env_config.WS_RESET_INTERVAL_SECONDS * 1000);
  fn();
}

async function reload() {
  await client.reload();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function drawSpinner(message: string) {
  if (!!process.env.DEBUG) {
    // Don't draw spinner when logging is enabled
    return;
  }
  const spinnerFrames = ["-", "\\", "|", "/"];
  let frameIndex = 0;

  setInterval(() => {
    process.stdout.write(`\r${message} ${spinnerFrames[frameIndex]}`);
    frameIndex = (frameIndex + 1) % spinnerFrames.length;
  }, 100);
}

function getDebugLogger(context: string) {
  return require("debug")(`mfi:liquidator:${context}`);
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
