import { MarginfiAccount, MarginfiClient, MarginfiConfig } from "@mrgnlabs/marginfi-client-v2";
import { NotificationStatus, NotificationTypes } from "./health-notifier";
import { Wallet, chunkedGetRawMultipleAccountInfos } from "@mrgnlabs/mrgn-common";
import { Connection, PublicKey } from "@solana/web3.js";
import { logger } from "./logger";

export interface AccountState {
  accountPk: string;
  account: MarginfiAccount;
  notificationStatuses: {
    [notificationType in NotificationTypes]: NotificationStatus;
  };
}

export class AccountStore {
  accounts: { [accountPk: string]: AccountState } = {};

  async init(subscriberWallets: string[], mfiConfig: MarginfiConfig, rpcClient: Connection): Promise<void> {
    const mfiClient = await MarginfiClient.fetch(mfiConfig, {} as Wallet, rpcClient, { readOnly: true });

    let retryCount = 0;
    let success = false;
    while (retryCount < 3 && !success) {
      try {
        await this.loadAllMarginfiAccounts(subscriberWallets, mfiClient);
        success = true;
      } catch (error) {
        logger.error(`Error loading marginfi accounts: ${error}`);
        retryCount++;
      }
    }

    if (!success) {
      throw new Error("Failed to load marginfi accounts after 3 retries");
    }
  }

  upsert(accountPk: string, account: MarginfiAccount): void {
    if (this.accounts[accountPk]) {
      this.accounts[accountPk].account = account;
    } else {
      this.accounts[accountPk] = {
        accountPk,
        account,
        notificationStatuses: {
          dangerous_health: "inactive",
          liquidatable: "inactive",
        },
      };
    }
  }

  get(accountPk: string): AccountState | undefined {
    return this.accounts[accountPk];
  }

  getAll(): [string, AccountState][] {
    return Object.entries(this.accounts);
  }

  setNotificationStatus(accountPk: string, notificationType: NotificationTypes, status: NotificationStatus): void {
    this.accounts[accountPk].notificationStatuses[notificationType] = status;
  }

  private async loadAllMarginfiAccounts(subscribers: string[], mfiClient: MarginfiClient): Promise<void> {
    logger.info(`Loading initial accounts for ${subscribers.length} subscriber wallets`);
    
    const mfiAccounts = (
      await Promise.all(subscribers.map((sub) => mfiClient.getMarginfiAccountsForAuthority(new PublicKey(sub))))
    )
      .flat()
      .map((a) => a.pureAccount);

      for (const account of mfiAccounts) {
        this.upsert(account.address.toBase58(), account);
      }
  
    // const allAccountKeys = await mfiClient.getAllMarginfiAccountAddresses();
    // const [_, allAccountInfos] = await chunkedGetRawMultipleAccountInfos(
    //   mfiClient.provider.connection,
    //   allAccountKeys.map((pk) => pk.toBase58()),
    //   100
    // );
    // logger.info("Fetched all account data");

    // const allSubscriberAccountInfos = [...allAccountInfos.entries()].filter(([_, accountInfo]) => {
    //   const authorityBytes = accountInfo.data.subarray(40, 72);
    //   const accountAuthority = new PublicKey(authorityBytes).toBase58();
    //   return subscribers.includes(accountAuthority);
    // });

    // for (const [address, accountInfo] of allSubscriberAccountInfos) {
    //   const account = MarginfiAccount.fromAccountDataRaw(new PublicKey(address), accountInfo.data);
    //   this.upsert(account.address.toBase58(), account);
    // }

    logger.info(`Loaded ${Object.keys(this.accounts).length} subscriber accounts`);
  }
}
