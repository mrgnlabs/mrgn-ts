import { PublicKey } from "@solana/web3.js";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { getConfig, MarginfiAccountWrapper, MarginfiClient, MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { env_config, captureException } from "./config";
import { connection } from "./utils/connection";
import { loadBankMetadatas } from "./utils/bankMetadata";
import { chunkedGetRawMultipleAccountInfos } from "./utils/chunks";
import { sleep, drawSpinner, getDebugLogger } from "./utils";
import redisClient from "./lib/redisClient";
import { getUserSettings } from "./lib/firebase";
import { sendEmailNotification } from "./lib/resend";

let client: MarginfiClient;
let accountInfos: Map<PublicKey, MarginfiAccountWrapper> = new Map();

async function start() {
  console.log("Initializing");
  const wallet = new NodeWallet(env_config.WALLET_KEYPAIR!);

  const config = getConfig(env_config.MRGN_ENV!);
  client = await MarginfiClient.fetch(config, wallet, connection);

  console.log("Starting account health poller");
  console.log("Program id: ", client.program.programId.toString());
  console.log("Group: ", client.groupAddress.toString());

  let bankMetadataMap = await loadBankMetadatas();

  setInterval(async () => {
    try {
      bankMetadataMap = await loadBankMetadatas();
      console.log(bankMetadataMap);
    } catch (e) {
      console.error("Failed to refresh bank metadata", e);
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
      await client.reload();
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

      await Promise.all(targetAccounts.map((account) => checkAndSendNotifications(account)));

      debug("Ending main loop iteration");
      await sleep(env_config.SLEEP_INTERVAL_SECONDS * 1000);
    } catch (e) {
      console.error(e);
      captureException(e);
      await sleep(env_config.SLEEP_INTERVAL_SECONDS * 1000);
    }
  }
}

async function checkAndSendNotifications(account: MarginfiAccountWrapper) {
  const debug = getDebugLogger("notification-check");
  const notificationKey = `lastNotification:${account.address.toString()}`;
  const maintenanceComponentsWithBiasAndWeighted = account.computeHealthComponents(MarginRequirementType.Maintenance);
  const healthFactor = maintenanceComponentsWithBiasAndWeighted.assets.isZero()
    ? 1
    : maintenanceComponentsWithBiasAndWeighted.assets
        .minus(maintenanceComponentsWithBiasAndWeighted.liabilities)
        .dividedBy(maintenanceComponentsWithBiasAndWeighted.assets)
        .toNumber();
  const healthFactorPercentage = Math.floor(healthFactor * 100);

  debug("Scanning account: %s", account.address.toBase58());
  debug("Account authority: %s", account.authority.toBase58());
  debug("Health factor threshold: %d", env_config.HEALTH_FACTOR_THRESHOLD);
  debug("Health factor: %d", healthFactor);
  debug("Trigger notification: %s", healthFactor < env_config.HEALTH_FACTOR_THRESHOLD ? "Yes" : "No");

  if (healthFactor > env_config.HEALTH_FACTOR_THRESHOLD) return;

  const userData = await getUserSettings(account.address.toString());
  if (!userData || !userData.account_health) {
    debug("User not found or notifications are turned off.");
    return;
  }

  const lastNotificationTime = await redisClient.get(notificationKey);
  const now = Date.now();
  if (lastNotificationTime && now - parseInt(lastNotificationTime) < 24 * 60 * 60 * 1000) {
    debug("It’s too soon to send another notification.");
    return;
  }

  const { error } = await sendEmailNotification(userData.email, healthFactorPercentage);
  if (error) {
    debug("Error sending notification:", error);
    return;
  }

  await redisClient.set(notificationKey, now.toString());
  debug("Notification sent successfully.");
}

async function loadAllMarginfiAccounts() {
  console.log("Loading data, this may take a moment...");
  const debug = getDebugLogger("load-all-marginfi-accounts");
  debug("Loading all Marginfi accounts");
  let allKeys = [];

  if (env_config.MARGINFI_ACCOUNT_WHITELIST) {
    allKeys = env_config.MARGINFI_ACCOUNT_WHITELIST;
  } else {
    allKeys = await client.getAllMarginfiAccountAddresses();
  }

  debug("Retrieved all Marginfi account addresses, found: ", allKeys.length);
  const [slot, ais] = await chunkedGetRawMultipleAccountInfos(
    connection,
    allKeys.map((k) => k.toString()),
    16 * 64,
    64
  );
  debug("Received account information for slot ", slot, ", got: ", ais.size, " accounts");

  const totalAccounts = ais.size;
  let processedAccounts = 0;
  for (const [key, accountInfo] of ais) {
    const pubkey = new PublicKey(key);
    const account = MarginfiAccountWrapper.fromAccountDataRaw(pubkey, client, accountInfo.data);
    accountInfos.set(pubkey, account);

    processedAccounts++;
    if (processedAccounts % 5000 === 0) {
      const progress = ((processedAccounts / totalAccounts) * 100).toFixed(2);
      debug("Processed ", processedAccounts, " accounts out of ", totalAccounts, " (", progress, "%)");
    }
  }

  console.log("Finished loading all Marginfi accounts");
}

async function startWebsocketAccountUpdater() {
  const debug = getDebugLogger("start-websocket-account-updater");
  debug("Starting websocket account updater");
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
        debug("Failed to decode Marginfi account for public key: ", pubkey.toString(), ", Error: ", error);
      }
    });
  };

  setInterval(fn, env_config.WS_RESET_INTERVAL_SECONDS * 1000);
  fn();
}

async function startWithRestart() {
  try {
    await start();
  } catch (e) {
    console.error("Error starting the service, attempting to restart...", e);
    startWithRestart();
  }
}

startWithRestart();
