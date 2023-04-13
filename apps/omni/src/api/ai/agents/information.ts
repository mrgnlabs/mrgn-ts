import { OpenAI } from "langchain";
import { initializeAgentExecutor } from "langchain/agents";

import { AccountsTool, BanksTool, TokenInfoTool, getOmniQaTool } from '../tools';


const getInformationAgent = async ({ walletPublicKey }: { walletPublicKey: string; }) => {

  // Get base OpenAI model
  const model = new OpenAI({ 
      modelName: "text-davinci-003",
      openAIApiKey: process.env.OPENAI_API_KEY, 
      maxTokens: 1000,
      temperature: 0,
      verbose: true,
  });

  const tools = [
    new BanksTool(), 
    new TokenInfoTool(),
    new AccountsTool(walletPublicKey),
    await getOmniQaTool(),
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
