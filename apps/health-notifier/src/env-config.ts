import { z } from "zod";
import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import { Environment } from "@dialectlabs/sdk";
import { Environment as MarginfiEnvironment } from "@mrgnlabs/marginfi-client-v2";

dotenv.config();

let envSchema = z.object({
  CACHE_TTL_MS: z
    .string()
    .default("300000")
    .transform((s) => Number.parseInt(s)),
  DIALECT_SDK_KEYPAIR: z
    .string()
    .transform((keypairStr) => Keypair.fromSecretKey(new Uint8Array(JSON.parse(keypairStr)))),
  DIALECT_SDK_ENVIRONMENT: z
    .enum(["production", "staging", "local-development"])
    .default("local-development")
    .transform((s) => s as Environment),
  NOTIFICATION_LIQUIDATION_HEALTH_THRESHOLD_ACTIVATE: z.string().transform((s) => Number.parseFloat(s)),
  NOTIFICATION_LIQUIDATION_HEALTH_THRESHOLD_DEACTIVATE: z.string().transform((s) => Number.parseFloat(s)),
  NOTIFICATION_MAINTENANCE_HEALTH_THRESHOLD_ACTIVATE: z.string().transform((s) => Number.parseFloat(s)),
  NOTIFICATION_MAINTENANCE_HEALTH_THRESHOLD_DEACTIVATE: z.string().transform((s) => Number.parseFloat(s)),
  MARGINFI_RPC_ENDPOINT: z.string().url(),
  MARGINFI_RPC_ENDPOINT_WS: z.string().url(),
  MRGN_ENV: z
    .enum(["production", "alpha", "staging", "dev", "mainnet-test-1", "dev.1"])
    .default("production")
    .transform((s) => s as MarginfiEnvironment),
  POLLING_DURATION: z
    .string()
    .default("60")
    .transform((s) => Number.parseInt(s)),
  WS_ENDPOINT: z.string().url().optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

export const envConfig: EnvSchema = envSchema.parse(process.env);
