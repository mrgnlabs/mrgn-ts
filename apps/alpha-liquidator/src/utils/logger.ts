import { initTelemetry as _initTelemetry, Logger, setupErrorHooks, Tracer } from "@mrgnlabs/mrgn-telemetry";

let logger: Logger;
let tracer: Tracer;
let delayedShutdown: (signal?: any) => void;

function initTelemetry(serviceName: string): void {
  if (logger) {
    logger.warn("Logger already initialized");
    return;
  }

  const telemetry = _initTelemetry(serviceName);
  logger = telemetry.logger;
  tracer = telemetry.tracer;

  delayedShutdown = setupErrorHooks(logger);
}

function getLogger(): Logger {
  if (!logger) {
    throw new Error("Logger not initialized");
  }
  return logger;
}

function getTracer(): Tracer {
  if (!tracer) {
    throw new Error("Tracer not initialized");
  }
  return tracer;
}

export { initTelemetry, getLogger, getTracer, delayedShutdown };