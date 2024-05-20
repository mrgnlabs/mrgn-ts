import { AddressType, Dapp, DappMessageActionType, Dialect } from "@dialectlabs/sdk";
import { envConfig } from "./env-config";
import { Connection, Context, KeyedAccountInfo, PublicKey } from "@solana/web3.js";
import {
  AccountType,
  MarginRequirementType,
  MarginfiAccount,
  MarginfiClient,
  MarginfiConfig,
} from "@mrgnlabs/marginfi-client-v2";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import { Wallet, percentFormatterDyn, sleep } from "@mrgnlabs/mrgn-common";
import { AccountState, AccountStore } from "./account-store";
import { GroupMonitor } from "./group-monitor";
import { reduceSubscribers } from "./helpers";

export interface Subscriber {
  wallet: string;
  sinks: AddressType[];
}

export type NotificationTypes = "dangerous_health" | "liquidatable";

interface NotificationBase {
  type: NotificationTypes;
  account: string;
  wallet: string;
}

interface MaintenanceHealthNotification extends NotificationBase {
  type: "dangerous_health";
  account: string;
  wallet: string;
  health: number;
}

interface LiquidationHealthNotification {
  type: "liquidatable";
  account: string;
  wallet: string;
}

type Notification = MaintenanceHealthNotification | LiquidationHealthNotification;

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
    console.log(`Dapp:\n- Address: ${this.dapp.address}\n- Description: ${this.dapp.description}`);
  }

  async init(): Promise<void> {
    const subscriberRaw = await this.dapp.dappAddresses.findAll();

    this.subscribers = reduceSubscribers(subscriberRaw);
    console.log(`Subscribers: ${this.subscribers.length} addresses`);

    for (const wallet in this.subscribers) {
      const subscriber = this.subscribers[wallet];
      console.log(`Subscribed wallet: ${wallet}`);
      this.subscribers[wallet] = subscriber;
    }

    this.loadAllMarginfiAccounts(Object.keys(this.subscribers));
  }

  async run(): Promise<void> {
    await this.init();

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

    while (true) {
      const accounts = this.accountStore.getAll();

      let notifications: Notification[] = this.checkForNotifications(accounts);

      await this.notify(notifications);

      await sleep(20_000);
    }
  }

  async onAccountUpdate(keyedAccountInfo: KeyedAccountInfo, context: Context): Promise<void> {
    const authorityBytes = keyedAccountInfo.accountInfo.data.subarray(40, 72);
    const accountAuthority = new PublicKey(authorityBytes).toBase58();
    if (this.subscribers[accountAuthority] === undefined) {
      return;
    }
    console.log(`Subbed account updated: ${keyedAccountInfo.accountId.toBase58()} on slot ${context.slot}`);

    const mfiAccount = MarginfiAccount.fromAccountDataRaw(
      keyedAccountInfo.accountId,
      keyedAccountInfo.accountInfo.data
    );

    this.accountStore.upsert(keyedAccountInfo.accountId.toBase58(), mfiAccount);
  }

  private async loadAllMarginfiAccounts(subscribers: string[]) {
    const mfiClient = await MarginfiClient.fetch(this.mfiConfig, {} as Wallet, this.rpcClient, { readOnly: true });

    console.log(`Loading initial accounts for ${subscribers.length} subscribers`);
    const mfiAccounts = (
      await Promise.all(subscribers.map((sub) => mfiClient.getMarginfiAccountsForAuthority(new PublicKey(sub))))
    )
      .flat()
      .map((a) => a.pureAccount);

    for (const account of mfiAccounts) {
      this.accountStore.upsert(account.address.toBase58(), account);
    }

    console.log("Finished loading all Marginfi accounts");
  }

  async notify(notifications: Notification[]): Promise<void> {
    for (const notification of notifications) {
      let title: string;
      let message: string;
      switch (notification.type) {
        case "dangerous_health":
          title = `Your health factor fell below ${percentFormatterDyn.format(
            envConfig.NOTIFICATION_DANGEROUS_HEALTH_THRESHOLD_ACTIVATE
          )}`;
          message = `The value of your health factor just dropped under ${percentFormatterDyn.format(
            envConfig.NOTIFICATION_DANGEROUS_HEALTH_THRESHOLD_ACTIVATE
          )}. It is now ${percentFormatterDyn.format(notification.health)}.`;
          break;
        case "liquidatable":
          title = `Your health factor fell below ${percentFormatterDyn.format(0)}`;
          message = `Your health factor fell below ${percentFormatterDyn.format(0)}`;
          break;
        default:
          throw new Error(`This should not be possible!`);
      }

      await this.dapp.messages.send({
        recipient: notification.wallet,
        // notificationTypeId: notification.type,
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

  checkForDangerousHealth(
    accountPk: string,
    accountState: AccountState
  ): MaintenanceHealthNotification | undefined {
    const mfiAccount = accountState.account;
    const wallet = mfiAccount.authority.toBase58();
    const { assets, liabilities } = mfiAccount.computeHealthComponents(
      this.groupMonitor.banks,
      this.groupMonitor.oraclePrices,
      MarginRequirementType.Maintenance
    );
    const maintenanceHealth = assets.isZero() ? 1 : assets.minus(liabilities).div(assets).toNumber();
    // console.log(
    //   `Account: ${accountPk}: ${percentFormatterDyn.format(maintenanceHealth)} [${
    //     accountState.notificationStatuses["dangerous_health"]
    //   }]`
    // );

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

  checkForLiquidatable(
    accountPk: string,
    accountState: AccountState
  ): LiquidationHealthNotification | undefined {
    const mfiAccount = accountState.account;
    const wallet = mfiAccount.authority.toBase58();
    const { assets, liabilities } = mfiAccount.computeHealthComponents(
      this.groupMonitor.banks,
      this.groupMonitor.oraclePrices,
      MarginRequirementType.Maintenance
    );
    const liquidationHealth = assets.isZero() ? 1 : assets.minus(liabilities).div(assets).toNumber();
    // console.log(
    //   `Account: ${accountPk}: ${percentFormatterDyn.format(liquidationHealth)} [${
    //     accountState.notificationStatuses["liquidatable"]
    //   }]`
    // );

    if (
      accountState.notificationStatuses["liquidatable"] === "inactive" &&
      liquidationHealth < envConfig.NOTIFICATION_LIQUIDATABLE_THRESHOLD_ACTIVATE
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
      liquidationHealth >= envConfig.NOTIFICATION_LIQUIDATABLE_THRESHOLD_DEACTIVATE
    ) {
      this.accountStore.setNotificationStatus(accountPk, "liquidatable", "inactive");
    }
  }
}
