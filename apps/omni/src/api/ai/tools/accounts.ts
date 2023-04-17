import { Tool } from "langchain/tools";
import { Connection, PublicKey } from "@solana/web3.js";

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
    if (!marginfiAccount) return `No account was found for wallet ${this.walletPublicKey}`;
    return marginfiAccount.describe();
  }

  async _call(): Promise<string> {
    console.log("calling accounts tool");
    const account = await this.getAccounts();

    const PREFIX = `

      You called an Accounts tool that provides information on a specific user's marginfi account.

      Here is some context on how to read the account information:

      - "Balances" is a section that describes deposits and borrows in the account. It's first organized by token e.g. (mSOL, SOL) and then split into deposits and borrows for that token.
      - When users ask for information about their account, you should provide them with all of the non-zero deposits and borrows for all tokens.
      - "Deposits" and "Borrows" are denominated in the native token with the USD value in parentheses following the native value. "Total Deposits", "Total Liabilities", and "Equity" summaries for the whole account are denominated in USD.
      - Account "Health" describes how close the account is to liquidation, and ranges from 0-100%. A healthy account is one that is not close to liquidation. General account health ranges are:
        - 0-25%: Account is in danger of liquidation
        - 25-75%: Account is healthy, but should be monitored
        - 75-100%: Account is healthy
      - If the user asks about how health ratio is calculated, reference this LaTex equation to explain it:
      
      '
      \frac{(native\_deposits \times deposit\_weight\_maint) - (native\_borrows \times liability\_weight\_maint)}{(native\_assets \times deposit\_weight\_maint)}
      '

      Follow these rules:

      - Round all numbers to the second decimal.

      Here is the user's account information:
    `;

    const response = [PREFIX, account].join("\n\n");

    console.log({ response });

    return response;
  }
}

export { AccountsTool };
