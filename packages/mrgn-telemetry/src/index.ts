require("./instrumentation"); // needs to be required before importing winston or trace/span IDs will not be injected into logs

import { TransformableInfo } from "logform";
import { parseEnvConfig } from "./env_config";
import winston, { createLogger, format, Logger, transports } from "winston";
import { LoggingWinston } from "@google-cloud/logging-winston";
import chalk, { Chalk } from "chalk";
import { trace, Tracer } from "@opentelemetry/api";
import { AlwaysOnSampler, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { TraceExporter } from "@google-cloud/opentelemetry-cloud-trace-exporter";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { Resource } from "@opentelemetry/resources";

function initTelemetry(serviceName: string): { logger: Logger; tracer: Tracer } {
  const loggingConfig = parseEnvConfig();

  if (loggingConfig.MRGN_LOG_EXPORT_LEVEL === "disabled" && !loggingConfig.MRGN_IN_GCE) {
    const tracer = trace.getTracer("winston"); // No-op tracer provider
    const logger = createLocalLogger({
      serviceName,
      maxLevel: loggingConfig.MRGN_LOG_LEVEL,
    });
    return { logger, tracer };
  }

  // Create & register OpenTelemetry tracing provider + Google Cloud Trace exporter
  const provider = new NodeTracerProvider({
    sampler: new AlwaysOnSampler(),
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
  });
  const exporter = new TraceExporter();
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();

  if (loggingConfig.MRGN_LOG_EXPORT_LEVEL !== "disabled") {
    const tracer = trace.getTracer("winston");
    const logger = createGceRemoteLogger(loggingConfig.MRGN_LOG_LOG_NAME!, {
      serviceName,
      maxLevelConsole: loggingConfig.MRGN_LOG_LEVEL,
      maxLevelExport: loggingConfig.MRGN_LOG_EXPORT_LEVEL,
      projectId: loggingConfig.MRGN_LOG_PROJECT_ID,
      keyFilename: loggingConfig.MRGN_LOG_KEY_FILENAME,
      labels: loggingConfig.MRGN_LOG_LABELS,
    });

    return { logger, tracer };
  }

  if (loggingConfig.MRGN_IN_GCE) {
    const tracer = trace.getTracer("winston");
    const logger = createGceLocalLogger(loggingConfig.MRGN_LOG_LOG_NAME!, {
      serviceName,
      maxLevel: loggingConfig.MRGN_LOG_LEVEL,
      labels: loggingConfig.MRGN_LOG_LABELS,
    });

    return { logger, tracer };
  }

  throw new Error("Unreachable code");
}

// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
type LogLevelString = "error" | "warn" | "info" | "debug" | "trace";

interface LocalLoggerConfig {
  serviceName?: string;
  maxLevel?: LogLevelString;
  labels?: Record<string, string>;
}

interface RemoteLoggerConfig {
  serviceName?: string;
  projectId?: string;
  keyFilename?: string;
  maxLevelConsole?: LogLevelString;
  maxLevelExport?: LogLevelString;
  labels?: Record<string, string>;
}

const COLOR_MAP: Record<string, Chalk> = {
  verbose: chalk.magenta,
  debug: chalk.blue,
  info: chalk.green,
  warn: chalk.yellow,
  error: chalk.red,
};

const humanLogFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS Z" }),
  format.errors({ stack: true }),
  format.printf((info: TransformableInfo) => {
    let msg;
    if (info.serviceName)
      msg = `${chalk.dim(info.timestamp)} ${chalk.bold.italic(info.serviceName)} ${COLOR_MAP[info.level].bold(
        info.level.toUpperCase(),
      )} ${info.message}`;
    else {
      msg = `${chalk.dim(info.timestamp)} ${COLOR_MAP[info.level].bold(info.level.toUpperCase())} ${info.message}`;
    }

    if (info.level === "error" && info.stack) {
      msg += `\n${info.stack}`;
    }

    return msg;
  }),
);

/**
 * Creates:
 * - a local logger that logs exclusively to the console, in human-readable format
 * - a no-op tracer
 */
function createLocalLogger(config: LocalLoggerConfig): Logger {
  let labels: Record<string, string> | undefined = undefined;
  if (config.serviceName) labels = { serviceName: config.serviceName };

  return createLogger({
    defaultMeta: labels,
    format: humanLogFormat,
    transports: new transports.Console({
      level: config.maxLevel,
    }),
  });
}

/**
 * Creates:
 * - a logger that emits logs exclusively to the console, formatted as per the Google Ops Agent spec
 * - a tracer that exports spans through the Cloud Trace API
 */
function createGceLocalLogger(logName: string, config: LocalLoggerConfig): Logger {
  let labels: Record<string, string> = { logName, ...config.labels };
  if (config.serviceName) labels = { serviceName: config.serviceName, ...labels };

  const loggingWinston = new LoggingWinston({
    prefix: config.serviceName,
    serviceContext: {
      service: logName,
    },
    labels,
    level: config.maxLevel,
    logName,
    redirectToStdout: true,
    defaultCallback: (err: Error | null) => {
      if (err) {
        console.log("Error occurred in Cloud Logging log exporting: " + err);
      }
    },
  });

  return createLogger({
    defaultMeta: labels,
    transports: loggingWinston,
  });
}

/**
 * Creates:
 * - a logger that:
 *     - emits logs to the console, in a human-readable format
 *     - exports logs through the Google Cloud Logging API
 * - a tracer that exports spans through the Cloud Trace API
 */
function createGceRemoteLogger(logName: string, config: RemoteLoggerConfig): Logger {
  let labels: Record<string, string> = { ...config.labels };
  if (config.serviceName) labels = { serviceName: config.serviceName, ...labels };

  const loggingWinston = new LoggingWinston({
    projectId: config.projectId,
    keyFilename: config.keyFilename,
    prefix: config.serviceName,
    serviceContext: {
      service: logName,
    },
    labels,
    level: config.maxLevelExport,
    logName,
    defaultCallback: (err: Error | null) => {
      if (err) {
        console.log("Error occurred in Cloud Logging log exporting: " + err);
      }
    },
  });

  return createLogger({
    defaultMeta: labels,
    format: humanLogFormat,
    transports: [
      new transports.Console({
        level: config.maxLevelConsole,
      }),
      loggingWinston,
    ],
  });
}

export { createLocalLogger, createGceLocalLogger, createGceRemoteLogger, initTelemetry, Logger };
export type { LogLevelString, LocalLoggerConfig, RemoteLoggerConfig, Tracer };
