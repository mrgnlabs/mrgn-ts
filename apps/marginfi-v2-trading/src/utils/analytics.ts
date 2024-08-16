import posthog from "posthog-js";

const _checkEnv = () => !process.env.NEXT_PUBLIC_POSTHOG_API_KEY || process.env.NEXT_PUBLIC_ANALYTICS !== "true";

const _checkLog = () => process.env.NEXT_PUBLIC_ANALYTICS_LOG === "true";

const log = (message: string) => {
  if (_checkLog()) {
    console.log(message);
  }
};

export const init = () => {
  if (_checkEnv()) return;
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_API_KEY!, {
    api_host: "https://app.posthog.com",
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
  });
};

export const capture = (event: string, properties?: Record<string, any>) => {
  if (_checkEnv()) return;
  log(`[Analytics] Event: ${event}, Properties: ${JSON.stringify(properties)}`);
  posthog.capture(event, properties);
};

export const identify = (userId: string, properties?: Record<string, any>) => {
  if (_checkEnv()) return;
  log(`[Analytics] Identify: ${userId}, Properties: ${JSON.stringify(properties)}`);
  posthog.identify(userId, properties);
};

export const setPersonProperties = (properties: Record<string, any>) => {
  if (_checkEnv()) return;
  log(`[Analytics] Person Properties: ${JSON.stringify(properties)}`);
  posthog.setPersonProperties(properties);
};
