import { getGeneralAgent } from "./agents";

const callAI = async ({
  input,
  walletPublicKey
}: {
  input: string;
  walletPublicKey: string;
}) => {

  const executor = await getGeneralAgent({ walletPublicKey });

  const output = await executor.call({ input });

  return output;
}

export { callAI };
