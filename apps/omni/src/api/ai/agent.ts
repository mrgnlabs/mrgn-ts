import { OpenAI } from "langchain";
import { initializeAgentExecutor } from "langchain/agents";
import {
  AccountsTool,
  BanksTool,
  WalletBalancesTool,
  TokenInfoTool,
  TokenPriceTool,
  getOmniQaTool,
  MarginfiGlossary,
} from "./tools";
import config from "~/config";

const getGeneralAgent = async ({ walletPublicKey }: { walletPublicKey: string }) => {
  // Get base OpenAI model
  const model = new OpenAI({
    modelName: "gpt-3.5-turbo",
    // modelName: "text-davinci-003",
    openAIApiKey: process.env.OPENAI_API_KEY,
    maxTokens: 1000,
    temperature: 0.5,
    verbose: true,
  });

  const tools = [
    new MarginfiGlossary(),
    await getOmniQaTool(),
    // new BanksTool(config.rpcEndpoint),
    // new TokenInfoTool(),
    // new DecodedAccountsTool(config.rpcEndpoint),
    // new TokenPriceTool(config.rpcEndpoint),
    // new AccountsTool(walletPublicKey, config.rpcEndpoint),
    // new WalletBalancesTool(walletPublicKey, config.rpcEndpoint),
  ];

  const executor = await initializeAgentExecutor(tools, model, "zero-shot-react-description");

  return executor;
};

export { getGeneralAgent };
