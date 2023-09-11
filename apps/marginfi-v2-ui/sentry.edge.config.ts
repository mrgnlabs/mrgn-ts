import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://4e45fad1924b45c8de06994f5e49a23d@o1279738.ingest.sentry.io/4505855634636800",
  tracesSampleRate: 1,
  debug: false,
});
