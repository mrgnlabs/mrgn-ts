import { Tool } from "langchain/tools";
import { getClient } from "../utils";
import { Connection } from "@solana/web3.js";

class BanksTool extends Tool {
  name = "bank-tool";

  description =
    "A tool to get information about marginfi token pools, which are internally called Banks. Useful when you need to answer questions about the state of liquidity pools on the marginfi protocol or the price of a listed token. Input should be null.";

  connection: Connection;

  constructor(rpcEndpoint: string) {
    super();
    this.connection = new Connection(rpcEndpoint, "confirmed");
  }

  async getBanks() {
    const client = await getClient(this.connection);
    const banks = client.group.banks;

    const allBanksInformation = [...banks.values()].map((bank) => bank.describe());

    return JSON.stringify(allBanksInformation);
  }

  async _call(): Promise<string> {
    return this.getBanks();
  }
}

export { BanksTool };
