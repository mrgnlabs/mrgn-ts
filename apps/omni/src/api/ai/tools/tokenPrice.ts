import { Tool } from "langchain/tools";
import { Connection } from "@solana/web3.js";
import { PythHttpClient, getPythProgramKeyForCluster } from "@pythnetwork/client";
import { usdFormatter } from "@mrgnlabs/mrgn-common";

interface TokenPriceProps {
  tokenName: string;
}

class TokenPriceTool extends Tool {
  name = "realtime-token-price-tool";

  description =
    "A tool to fetch the current price for a token. Useful when a user requests price data about a token. Input is the token name. Output is the token price in USD.";

  connection: Connection;

  constructor(rpcEndpoint: string) {
    super();
    this.connection = new Connection(rpcEndpoint, "confirmed");
  }

  async getTokenPrice({ tokenName }: TokenPriceProps): Promise<string> {
    console.log("calling token price tool");

    const instrumentName = tokenName.toUpperCase();
    console.log({ instrumentName });
    const pythPublicKey = getPythProgramKeyForCluster("mainnet-beta");
    const pythClient = new PythHttpClient(this.connection, pythPublicKey);
    const data = await pythClient.getData();

    const instrumentData = data.productPrice.get(`Crypto.${instrumentName}/USD`);

    if (!instrumentData) {
      return `Error: Token ${instrumentName} not found`;
    }

    if (!instrumentData.price) {
      return `Error: Token price is not available for token ${instrumentName}`;
    }

    try {
      return `
      According to Pyth, current price for ${tokenName} is ${usdFormatter.format(instrumentData.price)} ${
        instrumentData.confidence ? "\xB1" + usdFormatter.format(instrumentData.confidence) : ""
      } USD. Marginfi uses Pyth's confidence intervals, an important risk management feature. Make sure you highlight that you're using Pyth to get the token price and marginfi's usage of Pyth's confidence intervals to the user.
      `;
    } catch (error) {
      return `Error: Token price is not available for token ${instrumentName}`;
    }
  }

  async _call(tokenName: string): Promise<string> {
    const price = await this.getTokenPrice({
      tokenName,
    });

    return price;
  }
}

export { TokenPriceTool };
