import type { NextApiRequest, NextApiResponse } from "next";
import { LLMChain } from "langchain";
import { ChatOpenAI } from "langchain/chat_models";
import { ZeroShotAgent, AgentExecutor } from "langchain/agents";
import { SerpAPI } from "langchain/tools";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "langchain/prompts";

const prefix = `
  Below you will find two things:
  
  1. A user prompt 
  Below is user input for a product called Superstake.

  Here's how Superstake works:

  1. Users can deposit mSOL into Superstake.
  2. The mSOL they deposit automatically acts as collateral against SOL borrows.
  3. The borrowed SOL is swapped into mSOL and the newly acquired mSOL is deposited into Superstake again.
  4. This loop continues to maximally leverage the mSOL and get leveraged staking rewards.

  Below, there is a user input. I want you to figure out what the user wants to do. They can only desire one of three things:

  1. Superstake X amount of mSOL
  2. Unstake X amount of mSOL
  3. Something else that's not allowed.

  Follow these rules:

  a) If they say "deposit" or something similar, assume I  meant superstake.
  b) If they say "withdraw" or something similar, assume I meant unstake.
  c) If they use any other ticker than mSOL, assume the action is illegal.
  d) The value CANNOT be anything but a valid number above 0 with no more than 9 decimals. If you don't know the exact number from the prompt or if the number doesn't adhere to being over 0 or having no more than 9 decimals, assume it's 0 and that the action is illegal.

  If and ONLY if the user's input is legal, respond with a string that says "It sounds like you want to [action] [value] mSOL. I'm setting up a transaction for you. " where [action] is either "superstake" or "unstake" and [value] is the number they want to superstake or unstake.

  If and ONLY if [action] is "superstake", the next sentence in your response should say "Superstaking mSOL involves depositing [value] mSOL into marginfi. This will automatically borrow [value * 0.7] SOL and swap it into mSOL. The newly acquired mSOL will be deposited into marginfi again. This loop will continue to maximally leverage the mSOL and get you leveraged staking rewards."

  If the user's input is illegal, say "That doesn't sound like a legal action. Try to superstake some mSOL."

  Your response will be typed out to the user, so format your response as if you're talking to them in first person. Make sure it's grammatically correct. Write in full sentences. In your response, tell the user what you think they want to do and that you're "setting up a transaction" for them to do it.

  Here is their input:
`

const suffix = ''

interface ResponseProps {
  req: NextApiRequest;
}

const getResponse = async ({ req }: ResponseProps)  => {
  console.log('hitting api');
  const tools = []

  const prompt = ZeroShotAgent.createPrompt(tools, {
    prefix: prefix,
    suffix: suffix,
  });

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    new SystemMessagePromptTemplate(prompt),
    HumanMessagePromptTemplate.fromTemplate(`{input}

  This was your previous work (but I haven't seen any of it! I only see what you return as final answer):
  {agent_scratchpad}`),
    ]);

  const chat = new ChatOpenAI({});

  const llmChain = new LLMChain({
    prompt: chatPrompt,
    llm: chat,
  });

  const agent = new ZeroShotAgent({
    llmChain,
    allowedTools: tools.map((tool) => tool.name),
  });

  const executor = AgentExecutor.fromAgentAndTools({ agent, tools });

  const res = await executor.run(req.body.prompt);

  console.log(res)
  return res
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await getResponse({req});
    res.status(200).json(response);
  } catch (error) {

    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Error calling OpenAI API' });

  }
}
