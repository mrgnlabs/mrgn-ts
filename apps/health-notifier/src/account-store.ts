import { MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";
import { NotificationStatus, NotificationTypes } from "./health-notifier";

export interface AccountState {
  accountPk: string;
  account: MarginfiAccount;
  notificationStatuses: {
    [notificationType in NotificationTypes]: NotificationStatus;
  };
}

export class AccountStore {
  accounts: { [accountPk: string]: AccountState } = {};

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
}
