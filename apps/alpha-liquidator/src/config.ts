import { z } from "zod";
import dotenv from "dotenv";

const Sentry = require("@sentry/node");

dotenv.config();

/*eslint sort-keys: "error"*/
let envSchema = z.object({
  IS_DEV: z.boolean().default(false),
  KEYPAIR_PATH: z.string(),
  LIQUIDATOR_PK: z.string(),
  MIN_SOL_BALANCE: z.string().default("0.5"),
  MRGN_ENV: z.enum(["production", "alpha", "staging", "dev", "mainnet-test-1", "dev.1"]).default("production"),
  RPC_ENDPOINT: z.string().url(),
  SENTRY: z.string().default(""),
  SENTRY_DSN: z.string().optional(),
  SLEEP_INTERVAL: z.number().default(5_000),
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
