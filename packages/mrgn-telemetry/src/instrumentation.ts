import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { LoggingWinston } from "@google-cloud/logging-winston";

registerInstrumentations({
  instrumentations: [
    new WinstonInstrumentation({
      logHook: (span, record) => {
        record[LoggingWinston.LOGGING_TRACE_KEY] = `projects/marginfi-dev/traces/${span.spanContext().traceId}`; // *Needed* for log-trace correlation *Not* injected by default by the exporter
        record[LoggingWinston.LOGGING_SPAN_KEY] = span.spanContext().spanId; // *Not* injected by default by the exporter
        record["timestamp"] = new Date(); // *Needs* to be a `Date` instance
      },
    }),
  ],
});
