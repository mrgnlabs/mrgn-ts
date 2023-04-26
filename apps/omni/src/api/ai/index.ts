import { PromptTemplate } from "langchain";
import { StructuredOutputParser } from "langchain/output_parsers";
import { getGeneralAgent } from "./agent";
import { z } from "zod";

const outputParser = StructuredOutputParser.fromZodSchema(
  z.object({
    answer: z.string().describe("informative answer to the users query"),
    actions: z.array(
      z.object({
        key: z.string().describe("omeni action action key as determined by the omni action tool"),
        description: z.string().describe("action summary"),
        params: z.array(
          z.object({
            key: z
              .string()
              .describe(
                "omni action parameter key, as described by the omni-action tool, and inferred form the user request"
              ),
            value: z
              .string()
              .describe("omni action parameter value, as described by the tool, and inferred from the user request"),
          })
        ),
      })
    ),
  })
);

const promptTemplate = new PromptTemplate({
  template: `
You are Omni, and your goal is to help humans learn about and interact with the Solana blockchain and protocols on the Solana blockchain.

If users don't provide context for their request assume the context is marginfi.

{format_instructions}

The user query might contain questions and requests that might be completed with omni-actions.

User query: "{query}"

`,
  inputVariables: ["query"],
  validateTemplate: false,
  partialVariables: { format_instructions: outputParser.getFormatInstructions() },
});

const callAI = async ({ input, walletPublicKey }: { input: string; walletPublicKey: string }) => {
  walletPublicKey = walletPublicKey || "GqJX498c6EdywuDh93uyYvL8816Yc4Xsuz6nYgzDJEtU";
  console.log({ walletPublicKey });

  const executor = await getGeneralAgent({ walletPublicKey });

  const prompt = await promptTemplate.format({ query: input });
  console.log("Prompt", prompt);
  const result = await executor.call({ input: prompt });

  const output = await outputParser.parse(result.output);
  console.log(output);

  return output;
};

export { callAI };

// A user has a request.

// Depositing involves sending tokens from the user wallet to a protocol's account. Withdrawing involves sending tokens from a protocol's account to the user wallet. Repaying involves sending tokens from the user wallet to a protocol's account. Borrowing involves sending tokens from a protocol's account to the user wallet. Staking involves sending token from the user wallet to a protocol's account. Unstaking involves sending tokens from a protocol's account to the user wallet. Superstaking involves sending tokens from the user wallet to a protocol's account. Unsuperstaking involves sending tokens from a protocol's account to the user wallet.

// - If you categorize the prompt as a request for action (1), but .

// - Use token names rather than their mint address unless specified otherwise (e.g. USDC instead of EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v, SOL instead of So11111111111111111111111111111111111111112 etc.)

// ----

// Here are rules to follow when responding:
//     - Token names are often used interchangeably with their mint addresses. For example, "USDC" and "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" are the same thing. When responding to a prompt, use the token name if it is provided, otherwise use the token mint address.
//     - Token names are often very close in spelling to other token names. Never assume that a token name is a typo for another token name. For example, "USDC" and "USDT" are not the same thing, same for "USD" and "USDC".
//     - If you categorize the prompt as a request for action, leave the numbers in their original format.
//     - Format units properly (e.g. 1.5 SOL, 1.5 USDC, $1.2).
