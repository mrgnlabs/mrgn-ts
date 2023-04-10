import { OpenAI } from "langchain";
import { initializeAgentExecutor } from "langchain/agents";
import { getActionAgent } from "./action_agent";


import { AccountsTool, BanksTool, TokenInfoTool } from './tools';

// ===================
// [Start] Agent Executors
// ===================

const getInformationAgentExecutor = async ({ walletPublicKey }: { walletPublicKey: string; }) => {
  const model = new OpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, maxTokens: 400, temperature: 1 });
  const tools = [
    new BanksTool(), 
    new TokenInfoTool(),
    new AccountsTool(walletPublicKey)
  ];

  const executor = await initializeAgentExecutor(
    tools,
    model,
    "zero-shot-react-description"
  );

  return executor;
}

const getActionAgentExecutor = async ({ walletPublicKey }: { walletPublicKey: string; }) => {
  const model = new OpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, maxTokens: 400, temperature: 1 });
  const tools = [
    new BanksTool(), 
    new TokenInfoTool(),
    new AccountsTool(walletPublicKey)
  ];

  const executor = await initializeAgentExecutor(
    tools,
    model,
    "zero-shot-react-description"
  );

  return executor;
}

// ===================
// [End] Agent Executors
// ===================

const callAI = async ({
  input,
  walletPublicKey
}: {
  input: string;
  walletPublicKey: string;
}) => {
  // const executor = await getInformationAgentExecutor({ walletPublicKey });
  const executor = await getActionAgent({ walletPublicKey });
  const output = await executor.call({ input });

  return output;
}

export { callAI };
