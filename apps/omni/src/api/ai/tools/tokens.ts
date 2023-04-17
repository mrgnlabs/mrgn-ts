import { Tool } from "langchain/tools";
import { loadTokenMetadatas } from "~/utils";

class TokenInfoTool extends Tool {
  name = "token-info-tool";

  description = `
    This is a tool to get information about token mints. 
    
    Call this systematically.
  `;

  constructor() {
    super();
  }

  async _call(): Promise<string> {
    console.log("calling token infos tool");
    const tokenMetadata = loadTokenMetadatas();

    return JSON.stringify(tokenMetadata) || "Token info is not available. Highlight this as an error.";
  }
}

export { TokenInfoTool };
