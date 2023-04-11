import { Tool } from "langchain/tools";

import { PublicKey } from "@solana/web3.js";
import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";

import { getClient } from '../utils';

interface AccountsProps { walletPublicKey: string }

const getAccounts = async ({ walletPublicKey }: AccountsProps) => {
  const client = await getClient();
  const accounts = await client.getMarginfiAccountsForAuthority(
    new PublicKey(walletPublicKey)
  );
  const account = accounts[0]

  const componentsEquity = account.getHealthComponents(MarginRequirementType.Equity);
  const componentMaintenance = account.getHealthComponents(MarginRequirementType.Maint);
  const componentInitial = account.getHealthComponents(MarginRequirementType.Init);

  // User metrics
  const equityValueUsd = componentsEquity.assets.minus(componentsEquity.liabilities).toNumber();
  const totalLentValueUsd = componentsEquity.assets.toNumber();
  const totalBorrowedValueUsd = componentsEquity.liabilities.toNumber();
  const healthMaintenancePercent = componentMaintenance.assets
    .minus(componentMaintenance.liabilities)
    .div(componentMaintenance.assets)
    .times(100)
    .toNumber();

  const resJson = {
    userAccountBalanceInUSD: equityValueUsd,
    totalLentByUserInUSD: totalLentValueUsd,
    totalBorrowedBYUserInUSD: totalBorrowedValueUsd,
    userHealthRatio: healthMaintenancePercent,
  }

  return JSON.stringify(resJson)
}

class AccountsTool extends Tool {
  name = "accounts-tool";
  walletPublicKey: string;

  description =
    "A tool to get information about a user's marginfi account. Useful when you need to answer questions about a user's portfolio, specific positions, health ratio, etc. The wallet public key is initialized in the constructor.";

  constructor(walletPublicKey: string) {
    super();
    this.walletPublicKey = walletPublicKey;
  }

  async _call(): Promise<string> {
    return await getAccounts({ walletPublicKey: this.walletPublicKey });
  }
}

export { AccountsTool }
 