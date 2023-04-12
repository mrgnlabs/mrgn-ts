import { getManagerAgent, getInformationAgent, getActionAgent } from "./agents";
import { PromptTemplate } from "langchain/prompts";
import { ChatOpenAI } from "langchain/chat_models";

const PREFIX = `
  Determine which agent should be used for the user input below. 
  
  You have two choices: information or action. You must choose one of these two agents.

  Here is context on the two agents and what they can do:

  1. "information": Useful if the user is trying to answer a question or seeking information about something.
  2. "action": Useful if the user is trying to DO something. Examples: deposit, withdraw, borrow, repay, stake, unstake.
`

export const NAIVE_FIX_TEMPLATE = (instructions: string, completion: string, error: string) => `
Instructions:
--------------
${instructions}
--------------
Completion:
--------------
${completion}
--------------

Above, the Completion did not satisfy the constraints given in the Instructions.
Error:
--------------
${error}
--------------

Please try again. Please only respond with an answer that satisfies the constraints laid out in the Instructions:`;

const formatInstructions = `
  The output should be a string literal that is either "information" or "action". Be very strict with this output. Do not respond with any other text.
`

const callAI = async ({
  input,
  walletPublicKey
}: {
  input: string;
  walletPublicKey: string;
}) => {

  const manager = await getManagerAgent();  

  const prompt = new PromptTemplate({
    template: 
      [
        PREFIX,
        "\n{format_instructions}",
        "Here is the user input:",
        "\n{prompt}"
      ].join('\n\n'),
    inputVariables: ["prompt"],
    partialVariables: { format_instructions: formatInstructions },
  });
  const formattedInput = await prompt.format({ prompt: input });

  let response;
  let choice;
  const regex = /[^a-zA-Z0-9\s]/g;

  try {
    console.log('1. trying manager')
    response = await manager.call({ input: formattedInput });
    console.log({ response: JSON.stringify(response) })

    choice = response.output.trim().toLowerCase().replace(regex, '');

    console.log({ choice })
    if (choice !== "information" && choice !== "action") {
      throw new Error("The Completion did not satisfy the constraints given in the Instructions.");
    }
  } catch (error: any) {
    console.log('2. error during first manager try. trying again.')
    const fixinput = NAIVE_FIX_TEMPLATE([
        PREFIX,
        formatInstructions
      ].join("\n\n"), 
      response?.output || 'The output was undefined.', 
      error.message
    );

    console.log({ fixinput })
    response = await manager.call({ input: fixinput });
    console.log({ response: JSON.stringify(response) })
    choice = response.output.trim().toLowerCase().replace(regex, '');
  }

  let executor;
  if (choice === "action") {
    executor = await getActionAgent({ walletPublicKey });
  } else {
    executor = await getInformationAgent({ walletPublicKey });
  }

  const output = await executor.call({ input });

  return output;
}

export { callAI };
