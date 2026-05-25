export const DEPRECATION_PHASE: 1 | 2 = 2; // See linear for details

export const P0_APP_URL = "https://app.0.xyz";

type DeprecationCopy = {
  title: string;
  body: string;
  primaryCta: string;
  secondaryCta?: string;
};

export const DEPRECATION_COPY: Record<1 | 2, DeprecationCopy> = {
  1: {
    title: "We built a better dApp. We're moving there.",
    body: "On June 9th, all active positions will be managed through the Project 0 dApp only. The marginfi dApp will redirect there. You can already use the Project 0 dApp today with your existing positions.",
    primaryCta: "Continue to Project 0",
    secondaryCta: "Continue using marginfi",
  },
  2: {
    title: "We built a better dApp. We're moving there.",
    body: "All active positions can be managed through the Project 0 dApp. Experience upgraded functionality & access, including venues like Kamino, Jupiter Lend, Drift, and more in addition to Project 0's dynamic, adaptive lending pool.",
    primaryCta: "Go to Project 0",
  },
};
