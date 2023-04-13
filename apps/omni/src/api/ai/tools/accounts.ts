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
  const marginfiAccount = accounts[0]

  return marginfiAccount.describe();
}

class AccountsTool extends Tool {
  name = "accounts-tool";
  walletPublicKey: string;

  description =
    "A tool to get information about the state of a user's marginfi account. Useful when you need to answer questions about A user's balance, total deposits, liabilities, equity, or account health. The user's wallet public key is intialized in the constructor. Input should be null."

  constructor(walletPublicKey: string) {
    super();
    this.walletPublicKey = walletPublicKey;
  }

  async _call(): Promise<string> {
    return await getAccounts({ walletPublicKey: this.walletPublicKey });
  }
}

export { AccountsTool }
 