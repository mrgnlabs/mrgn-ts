import { Tool } from "langchain/tools";
import { getClient } from "../utils";
import { Connection } from "@solana/web3.js";

class BanksTool extends Tool {
  name = "bank-tool";

  description =
    "A tool to get information about marginfi token pools, which are internally called Banks. Useful when you need to answer questions about the state of liquidity pools on the marginfi protocol or answer questions about marginfi's risk management parameters. Input should be null.";

  connection: Connection;

  constructor(rpcEndpoint: string) {
    super();
    this.connection = new Connection(rpcEndpoint, "confirmed");
  }

  async getBanks() {
    const client = await getClient(this.connection);
    const banks = client.banks;

    const allBanksInformation = [...banks.values()].map((bank) => {
      const priceInfo = client.getOraclePriceByBank(bank.address)!;
      return bank.describe(priceInfo);
    });

    return JSON.stringify(allBanksInformation);
  }

  async _call(): Promise<string> {
    console.log("calling bank tool");

    const banks = await this.getBanks();

    const PREFIX = `
        You called a Banks tool that provides information on the entire marginfi protocol.

        This tool returns information on each bank in the marginfi protocol. You'll get a list of bank information. For each bank, you'll see the following data points:

        - Bank name: Banks are named after their token, e.g. SOL.
        - Bank address: The public key for the bank. Rarely relevant.
        - decimals: The number of decimals for the token. This is used to convert the token amount to a human-readable number and is rarely useful.
        - Total deposits: The total amount of deposits in the bank, denominated in the native token (e.g. SOL).
        - Total borrows: The total amount of borrows in the bank, denominated in the native token (e.g. SOL).
        - Total assets (USD value): The USD value of the total deposits.
        - Total liabilities (USD value): The USD value of the total borrows.
        - Asset price: The price of the token in USD.
        - Config: This section describes the risk management configuration for the bank. Weights describe how much marginfi trusts an asset: the closer the number is to 1, the better. Weights work as a discount factor: e.g. if the SOL maintenance asset weight is 0.80, 1 SOL deposited counts as 0.80 SOL's worth of USD value. Liability weights work the same way. If SOL's maintenance liability weight is 1.25, 1 SOL borrowed counts as 1.25 SOL's worth of USD value. For an account to be aboe water, adjusted deposits must be greater than adjusted borrows.
        - Max capacity: The maximum amount of deposits allowed for the bank, denominated in native token. This is a hard limit and a risk management parameter.

        Here is the bank info:
      `;

    const response = [PREFIX, banks].join("\n\n");

    console.log({
      response,
    });

    return response;
  }
}

export { BanksTool };
