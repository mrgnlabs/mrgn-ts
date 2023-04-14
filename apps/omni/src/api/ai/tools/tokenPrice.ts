import { Tool } from "langchain/tools";
import { Connection } from "@solana/web3.js";
import { PythHttpClient, getPythProgramKeyForCluster } from "@pythnetwork/client";

interface TokenPriceProps {
  tokenName: string;
}

class TokenPriceTool extends Tool {
  name = "token-price-tool";

  description =
    "A tool to fetch token prices. This tool can be used whenever a user requests involves the price of a token. The tool input is the token name. It returns the price in USD.";

  connection: Connection;

  constructor(rpcEndpoint: string) {
    super();
    this.connection = new Connection(rpcEndpoint, "confirmed");
  }

  async getTokenPrice({ tokenName }: TokenPriceProps): Promise<string | undefined> {
    const instrumentName = tokenName.toUpperCase();
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

    return instrumentData.price.toString();
  }

  async _call(tokenName: string): Promise<string> {
    const accounts = await this.getTokenPrice({
      tokenName,
    });
    return JSON.stringify(accounts);
  }
}

export { TokenPriceTool };
