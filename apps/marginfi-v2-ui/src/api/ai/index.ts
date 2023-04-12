import { getGeneralAgent } from "./agents";

const PREFIX = `
  Your name: Omni
  Your role: An autonomous agent that helps humans interact with the Solana blockchain.
  Your goals:
    - Answer user questions about the Solana blockchain, Solana protocols, and Solana tokens.

  Your final response will go directly to the user. Speak as if you're responding to them.

  Here's the user question:
`

const callAI = async ({
  input,
  walletPublicKey
}: {
  input: string;
  walletPublicKey: string;
}) => {

  const executor = await getGeneralAgent({ walletPublicKey });

  const formattedInput = [
    PREFIX,
    input
  ].join('\n\n');

  const output = await executor.call({ input: formattedInput });

  return output;
}

export { callAI };
