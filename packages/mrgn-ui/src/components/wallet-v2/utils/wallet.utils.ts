import { Wallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { BrowserTypes } from "@mrgnlabs/mrgn-utils";

export type WalletConnectionMethod = "INSTALL" | "DEEPLINK" | "CONNECT";

interface OsInfo {
  isPWA: boolean;
  isPhone: boolean;
  browser: BrowserTypes | undefined;
}

export function getWalletConnectionMethod(wallet: Wallet, osInfo: OsInfo): WalletConnectionMethod {
  const { isPWA, isPhone, browser } = osInfo;

  const isInAppBrowser = browser === "Phantom" || browser === "Backpack" || browser === "Solflare";
  const isWalletInstalled = wallet.readyState === WalletReadyState.Installed;

  if (isPWA || isInAppBrowser) return "CONNECT";
  if (isWalletInstalled && isPhone) return "CONNECT";
  if (isPhone) return "DEEPLINK";
  if (isWalletInstalled) return "CONNECT";
  if (wallet.adapter.name === "WalletConnect") return "CONNECT";
  return "INSTALL";
}
