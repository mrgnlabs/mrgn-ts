import { Tool } from "langchain/tools";
import { loadTokenMetadatas } from '~/utils';

class TokenInfoTool extends Tool {
  name = "token-info-tool";

  description =
    "A tool to get information on tokens supported by marginfi. Use it when you need to map token pubkeys to token symbols and names. Input should be null."

  constructor() {
    super();
  }

  async _call(): Promise<string> {
    const tokenMetadata = loadTokenMetadatas();

    return JSON.stringify(tokenMetadata) || 'Token info is not available. Highlight this as an error.';
  }
}

export { TokenInfoTool }
