import * as winston from 'winston';
import { envConfig } from './env-config';

const stackdriverFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.metadata({ fillExcept: ['timestamp', 'level', 'message'] }),
  winston.format.printf(({ level, message, timestamp, metadata }) => {
    const stackdriverPayload = {
      severity: level,
      message: message,
      timestamp: timestamp,
      ...metadata,
    };
    return JSON.stringify(stackdriverPayload);
  }),
);

const prettyFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.ms(),
  winston.format.colorize(),
  winston.format.prettyPrint(),
);

export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format:
        envConfig.DIALECT_SDK_ENVIRONMENT === 'local-development'
          ? prettyFormat
          : stackdriverFormat,
      level: envConfig.LOG_LEVEL,
    }),
  ],
});
