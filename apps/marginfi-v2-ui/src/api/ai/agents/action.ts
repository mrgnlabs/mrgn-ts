import {
  LLMSingleActionAgent,
  AgentActionOutputParser,
  AgentExecutor,
} from "langchain/agents";
import { LLMChain } from "langchain/chains";
import { OpenAI } from "langchain/llms";
import {
  BasePromptTemplate,
  BaseStringPromptTemplate,
  SerializedBasePromptTemplate,
  renderTemplate,
} from "langchain/prompts";
import {
  InputValues,
  PartialValues,
  AgentStep,
  AgentAction,
  AgentFinish,
} from "langchain/schema";
import { AccountsTool, BanksTool, TokenInfoTool } from '../tools';
import { Tool } from "langchain/tools";

// ===================
// [Start] Pre-prompts
// ===================

const PREFIX = `
  Predict the action that a user wants to take based on their input below, as well as the token and the amount of token they want to take that action with. You must choose one of the following 7 actions:

  1. deposit
  2. withdraw
  3. borrow
  4. repay
  5. stake
  6. unstake
  7. another action that's not allowed
`

const processInstructions = (toolNames: string) => `
While you don't know the final answer, use the following format to help you:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [${toolNames}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
`;

const WARM_START_INSTRUCTIONS = `
  Follow these rules:

  1. If a user says "lend" or similar, assume they want to deposit.
  2. If a user says "take out" or similar, assume they want to withdraw.
  3. If a user says "superstake" or similar, assume they want to stake.
  4. If a user says "unsuperstake", "withdraw my superstake", or similar, assume they want to unstake.
`;

const FORMAT_INSTRUCTIONS = `
  When you know:

  i. The action that the user wants to take
  ii. The token they want to take an action with
  iii. The amount of the token they want to take an action with

  Choose from the following output formats:

  If and ONLY if the user wants to take an action that's allowed, use the following format:

  "Final Answer: It sounds like you want to [action] [value] [token_symbol]. I'm setting up a transaction for you."

  If the user wants to take an action that's not allowed, respond with the following:

  "Final Answer: I regret to inform you that the action you want to take is not allowed."

  If the user wants to take an action with a token that's not supported, respond with the following:

  "Final Answer: Regrettably, [token] is not supported on marginfi yet."
`;

const SUFFIX = `Begin!

User input: {input}
Thought: {agent_scratchpad}
`;

// ===================
// [End] Pre-prompts
// ===================

// ===================
// [Start] Prompt Template
// ===================

class ActionPromptTemplate extends BaseStringPromptTemplate {
  tools: Tool[];

  constructor(args: { tools: Tool[]; inputVariables: string[] }) {
    super({ inputVariables: args.inputVariables });
    this.tools = args.tools;
  }

  _getPromptType(): string {
    throw new Error("Not implemented");
  }

  format(input: InputValues): Promise<string> {
    // ========
    // [Start] Setup
    // ========
    const toolStrings = this.tools
      .map((tool) => `${tool.name}: ${tool.description}`)
      .join("\n");
    const toolNames = this.tools.map((tool) => tool.name).join("\n");

    const template = [
      PREFIX,
      toolStrings,
      processInstructions(toolNames),
      WARM_START_INSTRUCTIONS,
      FORMAT_INSTRUCTIONS,
      SUFFIX,
    ].join("\n\n");
    // ========
    // [End] Setup
    // ========

    // ========
    // [Start] Intermediate Steps
    // ========
    const intermediateSteps = input.intermediate_steps as AgentStep[];
    const agentScratchpad = intermediateSteps.reduce(
      (thoughts, { action, observation }) =>
        thoughts +
        [action.log, `\nObservation: ${observation}`, "Thought:"].join("\n"),
      ""
    );
    const newInput = { agent_scratchpad: agentScratchpad, ...input };
    // ========
    // [End] Intermediate Steps
    // ========

    // return template
    return Promise.resolve(renderTemplate(template, "f-string", newInput));
  }

  partial(_values: PartialValues): Promise<BasePromptTemplate> {
    throw new Error("Not implemented");
  }

  serialize(): SerializedBasePromptTemplate {
    throw new Error("Not implemented");
  }
}

// ===================
// [End] Prompt Template
// ===================

// ===================
// [Start] Output parser
// ===================

class CustomOutputParser extends AgentActionOutputParser {
  async parse(text: string): Promise<AgentAction | AgentFinish> {
    if (text.includes("Final Answer:")) {
      const parts = text.split("Final Answer:");
      const input = parts[parts.length - 1].trim();
      const finalAnswers = { output: input };
      return { log: text, returnValues: finalAnswers };
    }

    const match = /Action: (.*)\nAction Input: (.*)/s.exec(text);
    console.log({match})
    if (!match) {
      throw new Error(`Could not parse LLM output: ${text}`);
    }

    return {
      tool: match[1].trim(),
      toolInput: match[2].trim().replace(/^"+|"+$/g, ""),
      log: text,
    };
  }

  getFormatInstructions(): string {
    throw new Error("Not implemented");
  }
}

// ===================
// [End] Output parser
// ===================

// ===================
// [Start] Agent
// ===================

const getActionAgent = async ({ walletPublicKey }: { walletPublicKey: string }) => {
  const model = new OpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, maxTokens: 400, temperature: 1 });
  const tools = [
    new BanksTool(), 
    new TokenInfoTool(),
    new AccountsTool(walletPublicKey)
  ];
  const llmChain = new LLMChain({
      prompt: new ActionPromptTemplate({ tools, inputVariables: ["input", "agent_scratchpad"] }),
      llm: model,
    })
  const agent = new LLMSingleActionAgent({
    llmChain,
    outputParser: new CustomOutputParser(),
    stop: ["\nObservation"],
  });
  const executor = new AgentExecutor({
    agent,
    tools,
  });
  console.log('Loaded action agent.')

  return executor;
}

export { getActionAgent }

// ===================
// [End] Agent
// ===================
