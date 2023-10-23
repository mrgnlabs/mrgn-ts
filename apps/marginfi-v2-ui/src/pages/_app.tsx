import React, { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { ConnectionProvider } from "~/hooks/useConnection";
import { Web3AuthProvider } from "~/hooks/useWeb3Auth";
import { init, push } from "@socialgouv/matomo-next";
import config from "~/config";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react";
import dynamic from "next/dynamic";
import { Desktop, Mobile } from "~/mediaQueries";
import { MobileNavbar } from "~/components/mobile/MobileNavbar";
import { WalletSelector } from "~/components/mobile/WalletSelector";
import { Tutorial } from "~/components/common/Tutorial";
import { useMrgnlendStore, useUiStore } from "~/store";
import { useLstStore } from "./stake";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WALLET_ADAPTERS } from "~/config/wallets";

import "swiper/css";
import "swiper/css/pagination";
import "react-toastify/dist/ReactToastify.min.css";

// Use require instead of import since order matters
require("@solana/wallet-adapter-react-ui/styles.css");
require("~/styles/globals.css");
require("~/styles/fonts.css");
require("~/styles/asset-borders.css");

const DesktopNavbar = dynamic(async () => (await import("~/components/desktop/DesktopNavbar")).DesktopNavbar, {
  ssr: false,
});
const Footer = dynamic(async () => (await import("~/components/desktop/Footer")).Footer, { ssr: false });

// Matomo
const MATOMO_URL = "https://mrgn.matomo.cloud";

const MyApp = ({ Component, pageProps }: AppProps) => {
  const [setIsFetchingData] = useUiStore((state) => [state.setIsFetchingData]);
  const [isMrgnlendStoreInitialized, isRefreshingMrgnlendStore] = useMrgnlendStore((state) => [
    state.initialized,
    state.isRefreshingStore,
  ]);
  const [isLstStoreInitialised, isRefreshingLstStore] = useLstStore((state) => [
    state.initialized,
    state.isRefreshingStore,
  ]);

  // enable matomo heartbeat
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT === "alpha") {
      init({ url: MATOMO_URL, siteId: "1" });
      // accurately measure the time spent in the visit
      push(["enableHeartBeatTimer"]);
    }
  }, []);

  useEffect(() => {
    const isFetchingData = isRefreshingMrgnlendStore || isRefreshingLstStore;
    setIsFetchingData(isFetchingData);
  }, [
    isLstStoreInitialised,
    isMrgnlendStoreInitialized,
    isRefreshingLstStore,
    isRefreshingMrgnlendStore,
    setIsFetchingData,
  ]);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <>
      <Head>
        <title>marginfi</title>
        <meta name="description" content="marginfi v2 UI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      {ready && (
        <ConnectionProvider endpoint={config.rpcEndpoint}>
          <WalletProvider wallets={WALLET_ADAPTERS} autoConnect={true}>
            <Web3AuthProvider>
              <Desktop>
                <WalletModalProvider>
                  <DesktopNavbar />
                  <div className="w-full flex flex-col justify-center items-center pt-[64px]">
                    <Component {...pageProps} />
                  </div>
                  <Footer />
                </WalletModalProvider>
              </Desktop>

              <Mobile>
                <MobileNavbar />
                <div className="w-full flex flex-col justify-center items-center sm:pt-[24px]">
                  <Component {...pageProps} />
                </div>
                <WalletSelector />
              </Mobile>
              <Analytics />
              <Tutorial />
              <ToastContainer position="bottom-left" theme="dark" />
            </Web3AuthProvider>
          </WalletProvider>
        </ConnectionProvider>
      )}
    </>
  );
};

export default MyApp;
