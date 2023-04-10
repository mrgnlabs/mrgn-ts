import { OpenAI } from "langchain";
import { initializeAgentExecutor } from "langchain/agents";

const getManagerAgent = async() => {
    const model = new OpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, maxTokens: 400, temperature: 1 });
    const executor = await initializeAgentExecutor(
      [],
      model,
      "zero-shot-react-description"
    );
    return executor;
}

export { 
  getManagerAgent
}
