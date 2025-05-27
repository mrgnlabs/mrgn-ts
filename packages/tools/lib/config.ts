import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Connection } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { MARGINFI_IDL, MarginfiIdlType } from "@mrgnlabs/marginfi-client-v2/src/idl";
import { loadKeypairFromFile } from "./utils";
import { Environment, Config } from "./types";

export const configs: Record<Environment, Config> = {
  production: {
    PROGRAM_ID: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
    GROUP_ADDRESS: "4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8",
  },
  staging: {
    PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
    GROUP_ADDRESS: "FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo",
  },
};

export const getConfig = (env: Environment = "production", groupAddress?: string): Config => {
  const config = configs[env];
  return {
    ...config,
    GROUP_ADDRESS: groupAddress || config.GROUP_ADDRESS,
  };
};

export const getMarginfiProgram = (env: Environment = "production") => {
  const config = getConfig(env);
  const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT, "confirmed");
  const wallet = loadKeypairFromFile(process.env.MARGINFI_WALLET);

  MARGINFI_IDL.address = config.PROGRAM_ID;

  const provider = new AnchorProvider(connection, wallet as any, {
    preflightCommitment: "confirmed",
  });

  return new Program<MarginfiIdlType>(MARGINFI_IDL as any, provider);
};

export const getDefaultYargsOptions = () => {
  return yargs(hideBin(process.argv))
    .option("env", {
      type: "string",
      choices: ["production", "staging"] as Environment[],
      default: "production",
      description: "Marginfi environment",
    })
    .option("group", {
      type: "string",
      description: "Marginfi group address",
      default: "4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8",
    });
};
