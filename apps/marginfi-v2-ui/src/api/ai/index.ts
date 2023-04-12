import { getManagerAgent, getInformationAgent, getActionAgent } from "./agents";

const callAI = async ({
  input,
  walletPublicKey
}: {
  input: string;
  walletPublicKey: string;
}) => {

  const manager = await getManagerAgent();
  
  const PREFIX = `
    Determine which agent should be used for the user input below. 
    
    You have two choices: information_agent or action_agent. You must choose one of these two agents. your ouput must be only the agent name.

    Here is more information about the two agents:

    information_agent: Answers information-seeking queries. For example, "What is marginfi?" or "How much am I lending?" Useful if the user is only seeking to retrieve information.
    action_agent: Sets up transactions for the user. The user must want to do something that requires a blockchain transaction. For example, depositing, withdrawing, or trading. Useful if the user is only seeking to perform an action.

    Here is the user input:
  `

  const template = [
    PREFIX,
    input
  ]
  const response = await manager.call({ input: template.join('\n\n')})
  const agent = response.output.toLowerCase().trim();

  console.log({ agent })

  let executor;
  if (agent === "information_agent") {
    executor = await getInformationAgent({ walletPublicKey });
  } else {
    executor = await getActionAgent({ walletPublicKey });
  }

  const output = await executor.call({ input });

  return output;
}

export { callAI };
