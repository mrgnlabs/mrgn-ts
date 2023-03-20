import winston, { Logger } from "winston";

type LogLevelString = "error" | "warn" | "info" | "debug";

interface LocalLoggerConfig {
  maxLevel?: LogLevelString;
  labels: Record<string, string>;
}

function getLocalLogger(config: LocalLoggerConfig): Logger {
  return winston.createLogger({
    level: config.maxLevel,

    defaultMeta: config.labels,
    transports: new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple(),
        winston.format.colorize(),
      ),
    }),
  });
}

function getGceLocalLogger(config: LocalLoggerConfig): Logger {
  return winston.createLogger({
    level: config.maxLevel,
    defaultMeta: config.labels,
    transports: [
      new winston.transports.Console(),
    ],
  });
}


interface RemoteLoggerConfig {
  logId: string,
  projectId: string,
  keyFilename: string,
  maxLevelLocal?: LogLevelString,
  maxLevelRemote?: LogLevelString,
}

function getRemoteLogger(loggerName: string, config: RemoteLoggerConfig): Logger {
  const { LoggingWinston } = require("@google-cloud/logging-winston");
  const loggingWinston = new LoggingWinston({
    projectId: config.projectId,
    keyFilename: config.keyFilename,
    logName: config.logId,
    level: config.maxLevelRemote,
    format: winston.format.json(),
  });
  return winston.createLogger({
    level: config.maxLevelLocal,
    format: winston.format.prettyPrint(),
    transports: [
      new winston.transports.Console(),
      loggingWinston,
    ],
  });
}

export { getLocalLogger, getGceLocalLogger, getRemoteLogger };
export type { LogLevelString, LocalLoggerConfig, RemoteLoggerConfig };