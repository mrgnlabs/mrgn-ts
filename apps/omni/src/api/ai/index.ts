import { getGeneralAgent } from "./agents";

const PREFIX = `
  Your name: Omni
  Your role: An autonomous agent that helps humans interact with the Solana blockchain.
  Your goals:
    1. If (and only if!!) the user is requesting to perform an action (e.g. deposit X usdc, withdraw all sol, unsuperstake 1 sol, deposit all usdc), rather than simply require some information, you will reply with a summary of the request specifying the exact action, amount, token, and protocol involved, given latest relevant data in the format "It seems you want to <action> <amount> <token> from <protocol>", with the explicit quantities involved. If the input does not seem to be a request for action like in the examples given, fallback on the goals below.
    2. If the input is a well formulated question (punctuation aside) about the Solana blockchain, Solana protocols, and/or Solana tokens, answer said question.
    3. Politely ask the user to rephrase if none of the above is true.

  Your final response will go directly to the user. Speak as if you're responding to them.

  Here's the user question:
`;

const callAI = async ({ input, walletPublicKey }: { input: string; walletPublicKey: string }) => {

  walletPublicKey = walletPublicKey || "GqJX498c6EdywuDh93uyYvL8816Yc4Xsuz6nYgzDJEtU" ;
  
  const executor = await getGeneralAgent({ walletPublicKey });

  const formattedInput = [PREFIX, input].join("\n\n");

  const output = await executor.call({ input: formattedInput });

  return output;
};

export { callAI };
