import { Tool } from "langchain/tools";
import { Connection, PublicKey } from "@solana/web3.js";
import { getClient } from "../utils";

class AccountsTool extends Tool {
  name = "accounts-tool";

  description = `
    This is a tool to get information about the state of a user's marginfi account.

    Call this when you are addressing questions and action requests which require you to know the state of the user's marginfi account, including any of the below pieces of information:
      - account balance
      - total deposits
      - liabilities
      - equity
      - account health
    
    Examples could be:
      - how much usdc do I have in my marginfi account?
      - how much sol do I have in my marginfi account?
      - withdraw all the sol I have from marginfi
      - unstake all the sol I have from marginfi
      - what is my marginfi account health?
  `;

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

      Here is how to read the account information:
        - Marginfi account: public key of the marginfi account.
        - Total deposits: aggregate USD-denominated asset value across all the account's token balances on the asset side.
        - Total liabilities: aggregate USD-denominated liability value across all the account's token balances on the liability side.
        - Equity: net USD-denominated value of the account.
        - Health: top-level metric describing how close the account is to liquidation, as a percentage ranging from 0% to 100%. A healthy account is one that is not close to liquidation. General account health ranges are:
          - 0-25%: danger of liquidation
          - 25-75%: healthy, but should be monitored
          - 75-100%: healthy
        - Balances: JSON-formatted list of active token balances for the user ("active" means that it may contain a non-zero balance). Each value contains:
          - tokenMint: the token mint, which can be associated to a token name through token infos
          - type: the balance type, to know if the balance represents a deposit, a borrow, or is empty
          - quantity: the native token balance
          - usdValue: the USD-denominated value of the balance

      Here is the user's account information:
    `;

    const response = [PREFIX, account].join("\n\n");

    console.log({ response: JSON.stringify(response) });

    return response;
  }
}

export { AccountsTool };
