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

/*eslint sort-keys: "error"*/
let envSchema = z.object({
  HEALTH_FACTOR_THRESHOLD: z
    .string()
    .optional()
    .default("0.95")
    .transform((s) => parseFloat(s)),
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
  MARGINFI_API_KEY: z.string(),
  MARGINFI_API_URL: z.string().url(),
  MRGN_ENV: z
    .enum(["production", "alpha", "staging", "dev", "mainnet-test-1", "dev.1"])
    .default("production")
    .transform((s) => s as Environment),
  PG_DATABASE: z.string(),
  PG_HOST: z.string(),
  PG_PASSWORD: z.string(),
  PG_PORT: z.string().regex(/^\d*$/),
  PG_USER: z.string(),
  RESEND_API_KEY: z.string(),
  RPC_ENDPOINT: z.string().url(),
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
  WALLET_KEYPAIR: z.string().transform((keypairStr) => {
    if (fs.existsSync(resolveHome(keypairStr))) {
      return loadKeypair(keypairStr);
    } else {
      return Keypair.fromSecretKey(new Uint8Array(JSON.parse(keypairStr)));
    }
  }),
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

  Sentry.captureMessage("Starting Account Health Poller");
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
