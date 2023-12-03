import posthog from "posthog-js";

export const useAnalytics = (): {
  init: () => void;
  capture: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: Record<string, any>) => void;
  setPersonProperties: (properties: Record<string, any>) => void;
} => {
  const _checkEnv = () =>
    !process.env.NEXT_PUBLIC_POSTHOG_API_KEY || process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT !== "production";

  const init = () => {
    if (_checkEnv()) return;
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_API_KEY!, { api_host: "https://app.posthog.com" });
  };

  const capture = (event: string, properties?: Record<string, any>) => {
    if (_checkEnv()) return;
    posthog.capture(event, properties);
  };

  const identify = (userId: string, properties?: Record<string, any>) => {
    if (_checkEnv()) return;
    posthog.identify(userId, properties);
  };

  const setPersonProperties = (properties: Record<string, any>) => {
    if (_checkEnv()) return;
    posthog.setPersonProperties(properties);
  };

  return { init, capture, identify, setPersonProperties };
};
