import { PublicKey } from "@solana/web3.js";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { getConfig, MarginfiAccountWrapper, MarginfiClient, MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";
import { env_config, captureException } from "./config";
import { connection } from "./utils/connection";
import { loadBankMetadatas } from "./utils/bankMetadata";
import { chunkedGetRawMultipleAccountInfos } from "./utils/chunks";
import { sleep, getDebugLogger, shortAddress } from "./utils";
import { sendEmailNotification } from "./lib/resend";

import { Dialect, DialectCloudEnvironment, DialectSdk } from "@dialectlabs/sdk";

import { NodeDialectSolanaWalletAdapter, Solana, SolanaSdkFactory } from "@dialectlabs/blockchain-sdk-solana";
import { Monitor, Monitors, Pipelines, ResourceId, SourceData } from "@dialectlabs/monitor";
import { Duration } from "luxon";
import { getMarginfiAccounts } from "./lib/api";
import { transformAccountMap } from "./lib/marginfiAcc";

let client: MarginfiClient;
let accountInfos: Map<PublicKey, MarginfiAccountWrapper> = new Map();
const environment: DialectCloudEnvironment = "production";
const dialectSolanaSdk: DialectSdk<Solana> = Dialect.sdk(
  {
    environment,
  },
  SolanaSdkFactory.create({
    // IMPORTANT: must set environment variable DIALECT_SDK_CREDENTIALS
    // to your dapp's Solana messaging wallet keypair e.g. [170,23, . . . ,300]
    wallet: NodeDialectSolanaWalletAdapter.create(),
  })
);

type YourDataType = {
  cratio: number;
  healthRatio: number;
  resourceId: ResourceId;
};

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
    } catch (e) {
      console.error("Failed to refresh bank metadata", e);
    }
  }, 10 * 60 * 1000); // refresh cache every 10 minutes

  // await loadAllMarginfiAccounts();
  // await startWebsocketAccountUpdater();
  // await mainLoop();

  await dialectMonitor();
}

async function dialectMonitor() {
  // 5. Build a Monitor to detect and deliver notifications
  const dataSourceMonitor: Monitor<YourDataType> = Monitors.builder({
    sdk: dialectSolanaSdk as any,
    subscribersCacheTTL: Duration.fromObject({ seconds: 5 }),
  })
    // (5a) Define data source type
    .defineDataSource<YourDataType>()
    // (5b) Supply data to monitor, in this case by polling
    //      Do on- or off-chain data extraction here to monitor changing datasets
    //      .push also available, see example/007-pushy-data-source-monitor.ts
    .poll(async (subscribers: ResourceId[]) => {
      //const accountsRaw = await client.getMarginfiAccountsForAuthority(pk)

      const test = [
        "DyFxabH3y8WQCmMKsMMDCi4kLfpxVwCvQ2jiZSUCdtxx",
        "3KzJW5CykCPErTnv9VonWbrE47K6a1QpokMVfa8cBSVH",
        "9j53Z6bejUaAxJCEC64BbxozLPuvsuAFsr6iqWKKDvaw",
        "6riLcXhKqdyVqVpdNerXMcHfEfWhfHXw45H6rpC4m9ie",
        "3HCF9okJmwXoBoBR8BLRqShqxtHznZkdtnBQWsSX5kY8",
      ];

      const memcmpParams = test.map((authority, index) => ({
        memcmp: {
          bytes: authority,
          offset: 8 + 32 * (index + 1), // Calculate offset based on authority index
        },
      }));

      const accounts = await getMarginfiAccounts(subscribers.map((v) => v.toBase58()));
      if (!accounts) return [];

      const wrappedAccounts = transformAccountMap(accounts, client);

      MarginfiAccountWrapper.fromAccountParsed;

      const ah = Object.values(accounts)[0][0];

      const account = ah.account;

      client.banks;

      const sourceData: SourceData<YourDataType>[] = subscribers.map((resourceId) => ({
        data: {
          cratio: Math.random(),
          healthRatio: Math.random(),
          resourceId,
        },
        groupingKey: resourceId.toString(),
      }));
      return Promise.resolve(sourceData);
    }, Duration.fromObject({ seconds: 3 }))
    // (5c) Transform data source to detect events
    .transform<number, number>({
      keys: ["cratio"],
      pipelines: [
        Pipelines.threshold({
          type: "falling-edge",
          threshold: 0.5,
        }),
      ],
    })
    // (5d) Add notification sinks for message delivery strategy
    //     Monitor has several sink types available out-of-the-box.
    //     You can also define your own sinks to deliver over custom channels
    //     (see examples/004-custom-notification-sink)
    //     Below, the dialectSdk sync is used, which handles logic to send
    //     notifications to all all (and only) the channels which has subscribers have enabled
    .notify()
    .dialectSdk(
      ({ value }) => {
        return {
          title: "dApp cratio warning",
          message: `Your cratio = ${value} below warning threshold`,
        };
      },
      {
        dispatch: "unicast",
        to: ({ origin: { resourceId } }) => resourceId,
      }
    )
    .also()
    .transform<number, number>({
      keys: ["cratio"],
      pipelines: [
        Pipelines.threshold({
          type: "rising-edge",
          threshold: 0.9,
        }),
      ],
    })
    .notify()
    .dialectSdk(
      ({ value }) => {
        return {
          title: "dApp cratio warning",
          message: `Your cratio = ${value} above warning threshold`,
        };
      },
      {
        dispatch: "unicast",
        to: ({ origin: { resourceId } }) => resourceId,
      }
    )
    // (5e) Build the Monitor
    .and()
    .build();

  await dataSourceMonitor.start();
}

async function mainLoop() {
  const debug = getDebugLogger("main-loop");
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

      // debug("Found %s accounts in total", allAccounts.length);
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
  const debug = getDebugLogger("account-health-check");
  const notiDebug = getDebugLogger("send-notification");
  const maintenanceComponentsWithBiasAndWeighted = account.computeHealthComponents(MarginRequirementType.Maintenance);
  const healthFactor = maintenanceComponentsWithBiasAndWeighted.assets.isZero()
    ? 1
    : maintenanceComponentsWithBiasAndWeighted.assets
        .minus(maintenanceComponentsWithBiasAndWeighted.liabilities)
        .dividedBy(maintenanceComponentsWithBiasAndWeighted.assets)
        .toNumber();
  const healthFactorPercentage = Math.floor(healthFactor * 100);

  debug("Scanning account: %s", account.address.toBase58());
  debug("Health factor: %d", healthFactor);
  debug("Trigger notification: %s", healthFactor < env_config.HEALTH_FACTOR_THRESHOLD ? "Yes" : "No");

  if (healthFactor > env_config.HEALTH_FACTOR_THRESHOLD) return;

  console.log("notify");

  //const userData = await getUserSettings(account.authority.toBase58());
  // if (!userData || !userData.account_health) {
  //   notiDebug("Wallet %s: User not found or notifications are turned off", shortAddress(account.authority.toBase58()));
  //   return;
  // }

  // // Adjusting to handle `null` last_notification correctly
  // const now = new Date();
  // let shouldSendNotification = false;

  // if (userData.last_notification) {
  //   const lastNotificationTime = new Date(userData.last_notification);
  //   const diffTime = now.getTime() - lastNotificationTime.getTime();
  //   shouldSendNotification = diffTime >= 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  // } else {
  //   // If last_notification is null, proceed to send notification
  //   shouldSendNotification = true;
  // }

  // if (shouldSendNotification) {
  //   const { error } = await sendEmailNotification(userData.email, healthFactorPercentage);
  //   if (error) {
  //     notiDebug("Wallet %s: Error sending notification", shortAddress(account.authority.toBase58()));
  //     return;
  //   }

  //   //await updateLastNotification(account.authority.toString(), now.toISOString());
  //   notiDebug("Wallet %s: Notification sent successfully", shortAddress(account.authority.toBase58()));
  // } else {
  //   notiDebug("Wallet %s: It’s too soon to send another notification", shortAddress(account.authority.toBase58()));
  // }
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
