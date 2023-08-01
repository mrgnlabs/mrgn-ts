import { OpenAI } from "langchain";
import { initializeAgentExecutor } from "langchain/agents";
import { AccountsTool, BanksTool, WalletBalancesTool, TokenInfoTool, TokenPriceTool, getOmniQaTool } from "./tools";

const getGeneralAgent = async ({ walletPublicKey }: { walletPublicKey: string }) => {
  // Get base OpenAI model
  const model = new OpenAI({
    modelName: "text-davinci-003",
    openAIApiKey: process.env.OPENAI_API_KEY,
    maxTokens: 1000,
    temperature: 0.5,
    verbose: true,
  });

  const rpcEndpoint = process.env.PRIVATE_RPC_ENDPOINT;
  if (!rpcEndpoint) {
    throw new Error("PRIVATE_RPC_ENDPOINT env var is missing");
  }

  const tools = [
    new BanksTool(rpcEndpoint),
    new TokenInfoTool(),
    // new DecodedAccountsTool(rpcEndpoint),
    new TokenPriceTool(rpcEndpoint),
    new AccountsTool(walletPublicKey, rpcEndpoint),
    new WalletBalancesTool(walletPublicKey, rpcEndpoint),
    await getOmniQaTool(),
    // new MarginfiGlossary(),
  ];

  const executor = await initializeAgentExecutor(tools, model, "zero-shot-react-description");

  return executor;
};

export { getGeneralAgent };
