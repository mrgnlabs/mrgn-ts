import inquirer from "inquirer";
import path from "path";
import { homedir } from "os";
import { MarginfiClient, getConfig } from "../src";
import { env_config } from "./config";
import { Connection } from "@solana/web3.js";
import { NodeWallet } from "@mrgnlabs/mrgn-common";

export async function confirmOrAbort(prompt: string) {
  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: prompt,
    },
  ]);
  if (!answer.confirm) {
    console.log("Aborting");
    process.exit(1);
  }
}

export function resolveHome(filepath: string) {
  if (filepath[0] === "~") {
    return path.join(homedir(), filepath.slice(1));
  }
  return filepath;
}

export async function getMarginfiClient(): Promise<MarginfiClient> {
  const connection = new Connection(env_config.RPC_ENDPOINT, "confirmed");
  const wallet = env_config.WALLET_KEYPAIR ? new NodeWallet(env_config.WALLET_KEYPAIR) : NodeWallet.local();
  const config = getConfig(env_config.MRGN_ENV);

  const client = await MarginfiClient.fetch(config, wallet, connection);

  return client;
}
