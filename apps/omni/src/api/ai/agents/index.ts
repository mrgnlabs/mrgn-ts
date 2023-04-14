import { OpenAI } from "langchain";
import { initializeAgentExecutor } from "langchain/agents";
import { AccountsTool, BanksTool, TokenInfoTool, getOmniQaTool, MarginfiGlossary } from '../tools';

const getGeneralAgent = async ({ walletPublicKey }: { walletPublicKey: string; }) => {

  // Get base OpenAI model
  const model = new OpenAI({ 
      modelName: "text-davinci-003",
      openAIApiKey: process.env.OPENAI_API_KEY, 
      maxTokens: 1000,
      temperature: 0.5,
      verbose: true,
  });

  const tools = [
    new BanksTool(), 
    new TokenInfoTool(),
    new AccountsTool(walletPublicKey),
    await getOmniQaTool(),
    new MarginfiGlossary(),
  ];

  const executor = await initializeAgentExecutor(
    tools,
    model,
    "zero-shot-react-description"
  );

  return executor;
}


export { getGeneralAgent }
