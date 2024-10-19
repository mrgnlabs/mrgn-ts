import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://5dd81f7047c001781ac8a520d8355f11@o1279738.ingest.us.sentry.io/4505861944573952",
  debug: false,
  autoSessionTracking: false,
  integrations: [],
  defaultIntegrations: false,
  enableTracing: false,
  tracesSampleRate: 0,
});
