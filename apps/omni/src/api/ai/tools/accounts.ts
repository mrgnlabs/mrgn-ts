import { Tool } from "langchain/tools";

import { Connection, PublicKey } from "@solana/web3.js";
import { MarginRequirementType } from "@mrgnlabs/marginfi-client-v2";

import { getClient } from "../utils";

class AccountsTool extends Tool {
  name = "accounts-tool";

  description =
    "A tool to get information about the state of a user's marginfi account. Useful when you need to answer questions about A user's balance, total deposits, liabilities, equity, or account health. The user's wallet public key is intialized in the constructor. Input should be null.";

  walletPublicKey: string;
  connection: Connection;

  constructor(walletPublicKey: string, rpcEndpoint: string) {
    super();
    this.walletPublicKey = walletPublicKey;
    this.connection = new Connection(rpcEndpoint, "confirmed");
  }

  async getAccounts() {
    const client = await getClient(this.connection);
    const accounts = await client.getMarginfiAccountsForAuthority(new PublicKey(this.walletPublicKey));
    const marginfiAccount = accounts[0];

    return marginfiAccount.describe();
  }

  async _call(): Promise<string> {
    return await this.getAccounts();
  }
}

export { AccountsTool };
