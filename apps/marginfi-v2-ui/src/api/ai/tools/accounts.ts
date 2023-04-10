import { Tool } from "langchain/tools";


import { PublicKey } from "@solana/web3.js";
import { nativeToUi } from "@mrgnlabs/mrgn-common";

import { getClient } from '../utils';

interface AccountsProps { walletPublicKey: string }

const getAccounts = async ({ walletPublicKey }: AccountsProps) => {
  const client = await getClient();
  const accounts = await client.getMarginfiAccountsForAuthority(
    new PublicKey(walletPublicKey)
  );
  const account = accounts[0]

  const resJson = account.activeBalances.map(
    (balance) => {

      const bank = client.group.banks.get(balance.bankPk.toBase58());

      if (bank) {
        return {
          token: balance.bankPk.toBase58(),
          lending: nativeToUi(balance.assetShares, bank.mintDecimals),
          borrowing: nativeToUi(balance.liabilityShares, bank.mintDecimals),
        }
      } else {
        return {}
      }
    }
  )

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
