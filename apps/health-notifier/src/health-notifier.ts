import { AddressType, Dapp, DappMessageActionType, Dialect } from "@dialectlabs/sdk";
import { envConfig } from "./env-config";
import { Connection, Context, KeyedAccountInfo, PublicKey } from "@solana/web3.js";
import { AccountType, MarginRequirementType, MarginfiAccount, MarginfiConfig } from "@mrgnlabs/marginfi-client-v2";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import { percentFormatterDyn, shortenAddress, sleep } from "@mrgnlabs/mrgn-common";
import { AccountState, AccountStore } from "./account-store";
import { GroupMonitor } from "./group-monitor";
import { reduceSubscribers } from "./helpers";
import { logger } from "./logger";

export interface Subscriber {
  wallet: string;
  sinks: AddressType[];
}

export type NotificationTypes = "dangerous_health" | "liquidatable";

export type NotificationIdMap = { [type in NotificationTypes]: string };

const notificationIdMap: NotificationIdMap = {
  dangerous_health: "9b60ea88-7699-4f14-802e-8e8556478bab",
  liquidatable: "5083aa1d-137e-42b4-885b-a3824e5f7db1",
};
interface NotificationBase {
  type: NotificationTypes;
  account: string;
  wallet: string;
}

interface DangerousHealthNotification extends NotificationBase {
  type: "dangerous_health";
  account: string;
  wallet: string;
  health: number;
}

interface LiquidatableNotification {
  type: "liquidatable";
  account: string;
  wallet: string;
}

type Notification = DangerousHealthNotification | LiquidatableNotification;

export type NotificationStatus = "active" | "inactive";

export class HealthNotifier {
  accountSubscription: number | undefined;
  subscribers: { [wallet: string]: Subscriber } = {};
  accountStore = new AccountStore();

  constructor(
    readonly sdk: Dialect,
    readonly dapp: Dapp,
    readonly rpcClient: Connection,
    readonly mfiConfig: MarginfiConfig,
    readonly groupMonitor: GroupMonitor
  ) {
    logger.info(`Dapp:\n- Address: ${this.dapp.address}\n- Description: ${this.dapp.description}`);
  }

  async init(): Promise<void> {
    // await this.dapp.messages.send({
    //   // notificationTypeId: notification.type,
    //   title: "ayayay",
    //   message: `(${shortenAddress(await PublicKey.createWithSeed(this.mfiConfig.programId, "hahah", this.mfiConfig.programId))}) \(${shortenAddress(await PublicKey.createWithSeed(this.mfiConfig.programId, "hahah", this.mfiConfig.programId))}\)`,
    // });

    await this.accountStore.init(this.mfiConfig, this.rpcClient);
    await this.refreshSubscribers();
  }

  async refreshSubscribers(): Promise<void> {
    const subscriberRaw = await this.dapp.dappAddresses.findAll();
    const updatedSubscribers = reduceSubscribers(subscriberRaw);

    const subscriberWallets = Object.keys(updatedSubscribers);
    const newSubscribers = subscriberWallets.filter((wallet) => !this.subscribers[wallet]);

    this.subscribers = updatedSubscribers;

    if (newSubscribers.length > 0) {
      await this.accountStore.loadAllMarginfiAccounts(newSubscribers);
    }
  }

  async run(): Promise<void> {
    setInterval(async () => {
      await this.refreshSubscribers();
    }, 60_000);

    const accountFilters = [
      {
        memcmp: {
          bytes: this.mfiConfig.groupPk.toBase58(),
          offset: 8,
        },
      },
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(BorshAccountsCoder.accountDiscriminator(AccountType.MarginfiAccount)),
        },
      },
    ];

    this.accountSubscription = this.rpcClient.onProgramAccountChange(
      this.mfiConfig.programId,
      this.onAccountUpdate.bind(this),
      "confirmed",
      accountFilters
    );

    logger.info(`Subscribed to account updates`);

    const accounts = this.accountStore.getAll();
    let notifications = this.checkForNotifications(accounts);
    if (notifications.length > 0) {
      logger.info(`Ignoring ${notifications.length} initial notifications for accounts:`);
      for (const notification of notifications) {
        logger.info(`- ${notification.account}`);
      }
    }

    while (true) {
      await sleep(20_000);
      const accounts = this.accountStore.getAll();
      let notifications = this.checkForNotifications(accounts);
      await this.notify(notifications);
    }
  }

  async onAccountUpdate(keyedAccountInfo: KeyedAccountInfo, context: Context): Promise<void> {
    const authorityBytes = keyedAccountInfo.accountInfo.data.subarray(40, 72);
    const accountAuthority = new PublicKey(authorityBytes).toBase58();
    if (this.subscribers[accountAuthority] === undefined) {
      return;
    }
    logger.info(`Subbed account updated: ${keyedAccountInfo.accountId.toBase58()} on slot ${context.slot}`);

    const mfiAccount = MarginfiAccount.fromAccountDataRaw(
      keyedAccountInfo.accountId,
      keyedAccountInfo.accountInfo.data
    );

    this.accountStore.upsert(keyedAccountInfo.accountId.toBase58(), mfiAccount);
  }

  async notify(notifications: Notification[]): Promise<void> {
    for (const notification of notifications) {
      let title: string;
      let message: string;
      switch (notification.type) {
        case "dangerous_health":
          title = `health alert 🚨`;
          message = `your marginfi account \(${shortenAddress(
            notification.account
          )}\) health factor is now ${percentFormatterDyn.format(notification.health)}.`;
          break;
        case "liquidatable":
          title = `health alert 🚨`;
          message = `your marginfi account \(${shortenAddress(
            notification.account
          )}\) health factor is now 0% - you are open to partial liquidations`;
          break;
        default:
          throw new Error(`This should not be possible!`);
      }

      logger.info(`Sending notification to ${notification.wallet}: ${notification.type}`);

      await this.dapp.messages.send({
        recipient: notification.wallet,
        notificationTypeId: notificationIdMap[notification.type],
        title,
        message,
        actionsV2: {
          type: DappMessageActionType.LINK,
          links: [
            {
              label: "View",
              url: `https://app.marginfi.com/portfolio`,
            },
          ],
        },
      });
    }
  }

  checkForNotifications(accounts: [string, AccountState][]): Notification[] {
    let notifications: Notification[] = [];

    for (const [accountPk, accountState] of accounts) {
      const maintenanceHealthNotification = this.checkForDangerousHealth(accountPk, accountState);
      if (maintenanceHealthNotification) {
        notifications.push(maintenanceHealthNotification);
      }

      const liquidationHealthNotification = this.checkForLiquidatable(accountPk, accountState);
      if (liquidationHealthNotification) {
        notifications.push(liquidationHealthNotification);
      }
    }

    return notifications;
  }

  checkForDangerousHealth(accountPk: string, accountState: AccountState): DangerousHealthNotification | undefined {
    const mfiAccount = accountState.account;
    const wallet = mfiAccount.authority.toBase58();
    const { assets, liabilities } = mfiAccount.computeHealthComponents(
      this.groupMonitor.banks,
      this.groupMonitor.oraclePrices,
      MarginRequirementType.Maintenance
    );
    const maintenanceHealth = assets.isZero() ? 1 : assets.minus(liabilities).div(assets).toNumber();

    if (
      accountState.notificationStatuses["dangerous_health"] === "inactive" &&
      maintenanceHealth < envConfig.NOTIFICATION_DANGEROUS_HEALTH_THRESHOLD_ACTIVATE
    ) {
      // NOTE: Toggling those here assumes that the notification are successfully sent out
      this.accountStore.setNotificationStatus(accountPk, "dangerous_health", "active");
      return {
        type: "dangerous_health",
        account: accountPk,
        wallet,
        health: maintenanceHealth,
      };
    } else if (
      accountState.notificationStatuses["dangerous_health"] === "active" &&
      maintenanceHealth >= envConfig.NOTIFICATION_DANGEROUS_HEALTH_THRESHOLD_DEACTIVATE
    ) {
      this.accountStore.setNotificationStatus(accountPk, "dangerous_health", "inactive");
    }
  }

  checkForLiquidatable(accountPk: string, accountState: AccountState): LiquidatableNotification | undefined {
    const mfiAccount = accountState.account;
    const wallet = mfiAccount.authority.toBase58();
    const { assets, liabilities } = mfiAccount.computeHealthComponents(
      this.groupMonitor.banks,
      this.groupMonitor.oraclePrices,
      MarginRequirementType.Maintenance
    );
    const maintenanceHealth = assets.isZero() ? 1 : assets.minus(liabilities).div(assets).toNumber();

    if (
      accountState.notificationStatuses["liquidatable"] === "inactive" &&
      maintenanceHealth < envConfig.NOTIFICATION_LIQUIDATABLE_THRESHOLD_ACTIVATE
    ) {
      // NOTE: Toggling those here assumes that the notification are successfully sent out
      this.accountStore.setNotificationStatus(accountPk, "liquidatable", "active");
      return {
        type: "liquidatable",
        account: accountPk,
        wallet,
      };
    } else if (
      accountState.notificationStatuses["liquidatable"] === "active" &&
      maintenanceHealth >= envConfig.NOTIFICATION_LIQUIDATABLE_THRESHOLD_DEACTIVATE
    ) {
      this.accountStore.setNotificationStatus(accountPk, "liquidatable", "inactive");
    }
  }
}
