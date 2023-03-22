import { z } from "zod";
import { LogLevelString } from "./index";

let loggingEnvSchema = z.object({
  MRGN_LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error"])
    .optional()
    .default("info")
    .transform((s) => s as LogLevelString),
  MRGN_LOG_EXPORT_LEVEL: z
    .enum(["disabled", "trace", "debug", "info", "warn", "error"])
    .default("disabled")
    .transform((s) => s as LogLevelString | "disabled"),
  MRGN_IN_GCE: z
    .string()
    .optional()
    .default("false")
    .transform((s) => s === "true" || s === "1"),
  MRGN_LOG_PROJECT_ID: z.string().optional(),
  MRGN_LOG_KEY_FILENAME: z.string().optional(),
  MRGN_LOG_LOG_NAME: z.string().optional(),
  MRGN_LOG_LABELS: z
    .string()
    .transform((labelKvs) => {
      return labelKvs.split(",").map((labelKv) => {
        const [key, value] = labelKv.split("=");
        return { key, value } as { key: string; value: string };
      })
        .reduce((acc, cur) => {
          return { ...acc, [cur.key]: cur.value };
        }, {} as Record<string, string>);
    })
    .optional(),
});

type LoggingEnvSchema = z.infer<typeof loggingEnvSchema>;

export function parseEnvConfig(): LoggingEnvSchema {
  const loggingConfig = loggingEnvSchema.parse(process.env);

  // Verify that the log name is provided unless logging is exclusively local
  if (loggingConfig.MRGN_LOG_EXPORT_LEVEL !== "disabled" || loggingConfig.MRGN_IN_GCE) {
    if (!loggingConfig.MRGN_LOG_LOG_NAME) {
      throw new Error("MRGN_LOG_LOG_NAME must be set");
    }
  }

  return loggingConfig;
}