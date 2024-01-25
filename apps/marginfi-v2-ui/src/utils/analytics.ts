import posthog from "posthog-js";

const _checkEnv = () => !process.env.NEXT_PUBLIC_POSTHOG_API_KEY || process.env.NEXT_PUBLIC_ANALYTICS !== "true";

export const init = () => {
  if (_checkEnv()) return;
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_API_KEY!, {
    api_host: "https://app.posthog.com",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
  });
};

export const capture = (event: string, properties?: Record<string, any>) => {
  if (_checkEnv()) return;
  posthog.capture(event, properties);
};

export const identify = (userId: string, properties?: Record<string, any>) => {
  if (_checkEnv()) return;
  posthog.identify(userId, properties);
};

export const setPersonProperties = (properties: Record<string, any>) => {
  if (_checkEnv()) return;
  posthog.setPersonProperties(properties);
};
