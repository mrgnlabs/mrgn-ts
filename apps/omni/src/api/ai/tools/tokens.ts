import { loadTokenMetadatas } from "@mrgnlabs/mrgn-common";
import { Tool } from "langchain/tools";

class TokenInfoTool extends Tool {
  name = "token-info-tool";

  description = `
    A tool to provide you metadata information on tokens supported by marginfi. Use this only when you need to map a token name to a token address. Input should be null.
  `;

  constructor() {
    super();
  }

  async _call(): Promise<string> {
    console.log("calling token infos tool");
    const tokenMetadata = loadTokenMetadatas();

    console.log({ tokenInfo: JSON.stringify(tokenMetadata) });

    return JSON.stringify(tokenMetadata) || "Token info is not available. Highlight this as an error.";
  }
}

export { TokenInfoTool };
