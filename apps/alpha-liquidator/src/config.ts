import { z } from "zod";
import dotenv from "dotenv";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Environment } from "@mrgnlabs/marginfi-client-v2";
import { loadKeypair } from "@mrgnlabs/mrgn-common";
import * as fs from "fs";
import path from "path";
import { homedir } from "os";

const Sentry = require("@sentry/node");

dotenv.config();

/*eslint sort-keys: "error"*/
let envSchema = z.object({
  IS_DEV: z
    .string()
    .optional()
    .default("false")
    .transform((s) => s === "true" || s === "1"),
  LIQUIDATOR_PK: z.string().transform((pkStr) => new PublicKey(pkStr)),
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
  MIN_SOL_BALANCE: z.coerce.number().default(0.5),
  MRGN_ENV: z
    .enum(["production", "alpha", "staging", "dev", "mainnet-test-1", "dev.1"])
    .default("production")
    .transform((s) => s as Environment),
  RPC_ENDPOINT: z.string().url(),
  SENTRY: z
    .string()
    .optional()
    .default("false")
    .transform((s) => s === "true" || s === "1"),
  SENTRY_DSN: z.string().optional(),
  SLEEP_INTERVAL: z.string().default("10000").transform((s) => parseInt(s, 10)),
  WALLET_KEYPAIR: z.string().transform((keypairStr) => {
    if (fs.existsSync(resolveHome(keypairStr))) {
      return loadKeypair(keypairStr);
    } else {
      console.log(keypairStr);
      return Keypair.fromSecretKey(new Uint8Array(JSON.parse(keypairStr)));
    }
  }),
});

type EnvSchema = z.infer<typeof envSchema>;

export const env_config: EnvSchema = envSchema.parse(process.env);

if (env_config.MARGINFI_ACCOUNT_BLACKLIST && env_config.MARGINFI_ACCOUNT_WHITELIST) {
  throw new Error("MARGINFI_ACCOUNT_BLACKLIST and MARGINFI_ACCOUNT_WHITELIST are mutually exclusive");
}

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
