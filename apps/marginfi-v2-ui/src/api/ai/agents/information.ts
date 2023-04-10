import { OpenAI } from "langchain";
import { initializeAgentExecutor } from "langchain/agents";

import { AccountsTool, BanksTool, TokenInfoTool } from '../tools';


const getInformationAgent = async ({ walletPublicKey }: { walletPublicKey: string; }) => {

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
  console.log('Loaded information agent.')

  return executor;
}

export { getInformationAgent }
