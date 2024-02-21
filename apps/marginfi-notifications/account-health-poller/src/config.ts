import { z } from "zod";
import dotenv from "dotenv";
import Sentry from "@sentry/node";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Environment } from "@mrgnlabs/marginfi-client-v2";
import { loadKeypair } from "@mrgnlabs/mrgn-common";
import * as fs from "fs";
import path from "path";
import { homedir } from "os";

dotenv.config();

if (!process.env.WALLET_KEYPAIR) {
  console.error("WALLET_KEYPAIR is required");
  process.exit(1);
}

if (!process.env.RPC_ENDPOINT) {
  console.error("RPC_ENDPOINT is required");
  process.exit(1);
}

/*eslint sort-keys: "error"*/
let envSchema = z.object({
  MRGN_ENV: z
    .enum(["production", "alpha", "staging", "dev", "mainnet-test-1", "dev.1"])
    .default("production")
    .transform((s) => s as Environment),
  RPC_ENDPOINT: z.string().url(),
  WALLET_KEYPAIR: z.string().transform((keypairStr) => {
    if (fs.existsSync(resolveHome(keypairStr))) {
      return loadKeypair(keypairStr);
    } else {
      return Keypair.fromSecretKey(new Uint8Array(JSON.parse(keypairStr)));
    }
  }),
  MARGINFI_ACCOUNT_BLACKLIST: z
    .string()
    .transform((pkArrayStr) => {
      return pkArrayStr.split(",").map((pkStr) => new PublicKey(pkStr));
    })
    .optional(),
  MARGINFI_ACCOUNT_WHITELIST: z
    .string()
    .transform((pkArrayStr) => {
      return pkArrayStr.split(",").map((pkStr) => new PublicKey(pkStr));
    })
    .optional(),
  SENTRY: z
    .string()
    .optional()
    .default("false")
    .transform((s) => s === "true" || s === "1"),
  SENTRY_DSN: z.string().optional(),
  SLEEP_INTERVAL_SECONDS: z
    .string()
    .default("5")
    .transform((s) => parseInt(s, 10)),
  WS_ENDPOINT: z.string().url().optional(),
  WS_RESET_INTERVAL_SECONDS: z
    .string()
    .optional()
    .default("300")
    .transform((s) => parseInt(s, 10)),
});

type EnvSchema = z.infer<typeof envSchema>;

export const env_config: EnvSchema = envSchema.parse(process.env);

if (env_config.SENTRY) {
  if (!env_config.SENTRY_DSN) {
    throw new Error("SENTRY_DSN is required");
  }

  console.log("Initializing Sentry");

  Sentry.init({ dsn: env_config.SENTRY_DSN });

  Sentry.captureMessage("Starting Alpha Liquidator");
}

process.on("unhandledRejection", (up) => {
  throw up;
});

export function captureException(err: any) {
  if (env_config.SENTRY) {
    Sentry.captureException(err);
  }
}

export function captureMessage(message: string) {
  if (env_config.SENTRY) {
    Sentry.captureMessage(message);
  }
}

function resolveHome(filepath: string) {
  if (filepath[0] === "~") {
    return path.join(homedir(), filepath.slice(1));
  }
  return filepath;
}
