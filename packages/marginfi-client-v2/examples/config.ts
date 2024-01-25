import { z } from "zod";
import dotenv from "dotenv";
import { Environment } from "../src";
import { Keypair } from "@solana/web3.js";
import * as fs from "fs";
import path from "path";
import { homedir } from "os";
import { loadKeypair } from "@mrgnlabs/mrgn-common";

dotenv.config();

let envSchema = z.object({
  MRGN_ENV: z
    .enum(["production", "dev"])
    .transform((s) => s as Environment),
  RPC_ENDPOINT: z.string().url(),
  WALLET_KEYPAIR: z.string().optional().transform((keypairStr) => {
    if (!keypairStr) return null;
    if (fs.existsSync(resolveHome(keypairStr))) {
      return loadKeypair(keypairStr);
    } else {
      return Keypair.fromSecretKey(new Uint8Array(JSON.parse(keypairStr)));
    }
  }),
});

type EnvSchema = z.infer<typeof envSchema>;

export const env_config: EnvSchema = envSchema.parse(process.env);

function resolveHome(filepath: string) {
  if (filepath[0] === "~") {
    return path.join(homedir(), filepath.slice(1));
  }
  return filepath;
}
