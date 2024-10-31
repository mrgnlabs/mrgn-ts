import * as Sentry from "@sentry/nextjs";

export const captureSentryException = (error: any, msg: string, tags: Record<string, string | undefined>) => {
  if (msg.includes("User rejected")) return;
  Sentry.setTags({
    ...tags,
    customMessage: msg,
  });
  Sentry.captureException(error);
};
