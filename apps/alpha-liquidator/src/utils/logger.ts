import { initTelemetry as _initTelemetry, Logger, Tracer } from "@mrgnlabs/mrgn-telemetry";

let logger: Logger;
let tracer: Tracer;

function initTelemetry(serviceName: string): void {
  if (logger) {
    logger.warn("Logger already initialized");
    return;
  }

  const telemetry = _initTelemetry(serviceName);
  logger = telemetry.logger;
  tracer = telemetry.tracer;
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

export { initTelemetry, getLogger, getTracer };