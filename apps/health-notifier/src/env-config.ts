import { z } from "zod";
import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import { Environment } from "@dialectlabs/sdk";
import { Environment as MarginfiEnvironment } from "@mrgnlabs/marginfi-client-v2";

dotenv.config();

let envSchema = z.object({
  DIALECT_SDK_KEYPAIR: z
    .string()
    .transform((keypairStr) => Keypair.fromSecretKey(new Uint8Array(JSON.parse(keypairStr)))),
  DIALECT_SDK_ENVIRONMENT: z
    .enum(["production", "staging", "local-development"])
    .transform((s) => s as Environment),
  NOTIFICATION_DANGEROUS_HEALTH_THRESHOLD_ACTIVATE: z.string().transform((s) => Number.parseFloat(s)),
  NOTIFICATION_DANGEROUS_HEALTH_THRESHOLD_DEACTIVATE: z.string().transform((s) => Number.parseFloat(s)),
  NOTIFICATION_LIQUIDATABLE_THRESHOLD_ACTIVATE: z.string().transform((s) => Number.parseFloat(s)),
  NOTIFICATION_LIQUIDATABLE_THRESHOLD_DEACTIVATE: z.string().transform((s) => Number.parseFloat(s)),
  MARGINFI_RPC_ENDPOINT: z.string().url(),
  MARGINFI_RPC_ENDPOINT_WS: z.string().url(),
  MRGN_ENV: z
    .enum(["production", "alpha", "staging", "dev", "mainnet-test-1", "dev.1"])
    .transform((s) => s as MarginfiEnvironment),
  WS_ENDPOINT: z.string().url().optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

export const envConfig: EnvSchema = envSchema.parse(process.env);
