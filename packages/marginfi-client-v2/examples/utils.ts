import inquirer from "inquirer";
import { MarginfiClient, getConfig } from "../src";
import { env_config } from "./config";
import { Connection, PublicKey } from "@solana/web3.js";
import { NodeWallet } from "@mrgnlabs/mrgn-common";

export async function confirmOrAbort(prompt: string) {
  const answer = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: prompt,
      default: false,
    },
  ]);
  if (!answer.confirm) {
    console.log("Aborting");
    process.exit(1);
  }
}

export async function getMarginfiClient({
  readonly,
  authority,
}: {
  readonly?: boolean;
  authority?: PublicKey;
} = {}): Promise<MarginfiClient> {
  const connection = new Connection(env_config.RPC_ENDPOINT, "confirmed");
  const wallet = env_config.WALLET_KEYPAIR ? new NodeWallet(env_config.WALLET_KEYPAIR) : NodeWallet.local();
  const config = getConfig(env_config.MRGN_ENV);

  if (authority && !readonly) {
    throw Error("Can only specify authority when readonly");
  }

  const client = await MarginfiClient.fetch(
    config,
    authority ? ({ publicKey: authority } as any) : wallet,
    connection,
    { readOnly: readonly }
  );

  return client;
}
