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
    Determine which agent I should use for the user input below.

    You must choose either information_agent or action_agent, and your output must be only that one agent name.

    Here is more information about the two agents:
  `
  const CONTEXT = JSON.stringify({
    "information_agent": "An agent that provides broad information about the marginfi protocol and user accounts. Useful if the user is seeking to retrieve information.",
    "action_agent": "An agent that sets up transactions for the user. Useful if the user is seeking to perform an action.",
  })

  const SUFFIX = `
    Here is the user input:
  `

  const template = [
    PREFIX,
    CONTEXT,
    SUFFIX,
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
