// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://c2875efdbe35bc4db77f24a3339a38c1@o1279738.ingest.us.sentry.io/4507934431248384",
  debug: false,
  autoSessionTracking: false,
  integrations: [],
  defaultIntegrations: false,
  enableTracing: false,
  tracesSampleRate: 0,
});
