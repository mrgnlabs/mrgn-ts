import React from "react";

import { useOs } from "./use-os";
import { useAvailableWallets } from "./use-available-wallets";

export type BrowserTypes =
  | "Chrome"
  | "Safari"
  | "Opera"
  | "Firefox"
  | "Edge"
  | "Brave"
  | "Phantom"
  | "Backpack"
  | "Solflare"
  | "PWA";

export const useBrowser = () => {
  const [browser, setBrowser] = React.useState<BrowserTypes>();
  const wallets = useAvailableWallets();
  const { isAndroid, isIOS, isPWA } = useOs();
  const isInAppPhantom = React.useMemo(
    () =>
      (localStorage.getItem("walletName")?.includes("Phantom") || window?.phantom?.solana?.isPhantom) &&
      (isIOS || isAndroid),
    [isAndroid, isIOS]
  );

  const isInAppBackpack = React.useMemo(() => window?.backpack?.isBackpack && (isIOS || isAndroid), [isAndroid, isIOS]);

  const isInAppSolflare = React.useMemo(
    () =>
      localStorage.getItem("walletName")?.includes("Solflare") ||
      wallets.find((wallet) => wallet.adapter.name === "Solflare")?.readyState === "Installed",
    [wallets]
  );

  React.useEffect(() => {
    const userAgent = navigator.userAgent;
    if (isPWA) {
      setBrowser("PWA");
    } else if (isInAppPhantom && (isIOS || isAndroid)) {
      setBrowser("Phantom");
    } else if (isInAppSolflare && (isIOS || isAndroid)) {
      setBrowser("Solflare");
    } else if (isInAppBackpack && (isIOS || isAndroid)) {
      setBrowser("Backpack");
    } else if (isAndroid) {
      setBrowser(getAndroidBrowser(userAgent));
    } else if (isIOS) {
      setBrowser(getIosBrowser(userAgent));
    } else {
      setBrowser("Chrome");
    }
  }, [isAndroid, isIOS, isInAppBackpack, isInAppPhantom, isInAppSolflare, isPWA]);

  return browser;
};

const getAndroidBrowser = (userAgent: string): BrowserTypes => {
  if (/Chrome/.test(userAgent) && /Android/.test(userAgent)) {
    return "Chrome";
  } else if (/Firefox/.test(userAgent) && /Android/.test(userAgent)) {
    return "Firefox";
  } else if (/Opera|OPR/.test(userAgent) && /Android/.test(userAgent)) {
    return "Opera";
  } else if (/EdgA/.test(userAgent) || /Edge/.test(userAgent)) {
    return "Edge";
  } else if (/Brave/.test(userAgent)) {
    return "Brave";
  } else {
    return "Chrome";
  }
};

const getIosBrowser = (userAgent: string): BrowserTypes => {
  if (/CriOS/.test(userAgent)) {
    return "Chrome";
  } else if (/FxiOS/.test(userAgent)) {
    return "Firefox";
  } else if (/OPiOS/.test(userAgent)) {
    return "Opera";
  } else if (/EdgiOS/.test(userAgent) || /Edge/.test(userAgent)) {
    return "Edge";
  } else if (/Brave/.test(userAgent)) {
    return "Brave";
  } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    return "Safari";
  } else if (/Chrome/.test(userAgent)) {
    return "Chrome";
  } else {
    return "Chrome";
  }
};
