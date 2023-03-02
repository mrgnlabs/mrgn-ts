import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

/*eslint sort-keys: "error"*/
let envSchema = z.object({
  IS_DEV: z.boolean().default(false),
  KEYPAIR_PATH: z.string(),
  LIQUIDATOR_PK: z.string(),
  MIN_SOL_BALANCE: z.number().default(10),
  MRGN_ENV: z.enum(["production", "alpha", "staging", "dev", "mainnet-test-1", "dev.1"]).default("production"),
  RPC_ENDPOINT: z.string().url(),
  SLEEP_INTERVAL: z.number().default(5_000),
});

type EnvSchema = z.infer<typeof envSchema>;

export const env_config: EnvSchema = envSchema.parse(process.env);
