import React, { useEffect } from "react";

import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import Head from "next/head";
import dynamic from "next/dynamic";

import { WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { init, push } from "@socialgouv/matomo-next";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react";
import posthog from "posthog-js";

import config from "~/config";
import { WALLET_ADAPTERS } from "~/config/wallets";
import { useMrgnlendStore, useUiStore } from "~/store";
import { useLstStore } from "./stake";
import { Desktop, Mobile } from "~/mediaQueries";
import { WalletProvider as MrgnWalletProvider } from "~/hooks/useWalletContext";
import { ConnectionProvider } from "~/hooks/useConnection";

import { MobileNavbar } from "~/components/mobile/MobileNavbar";
import { Tutorial } from "~/components/common/Tutorial";
import { WalletAuthDialog } from "~/components/common/Wallet";

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

const MATOMO_URL = "https://mrgn.matomo.cloud";

const MyApp = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  const [setIsFetchingData] = useUiStore((state) => [state.setIsFetchingData]);
  const [isMrgnlendStoreInitialized, isRefreshingMrgnlendStore, fetchMrgnlendState] = useMrgnlendStore((state) => [
    state.initialized,
    state.isRefreshingStore,
    state.fetchMrgnlendState,
  ]);
  const [isLstStoreInitialised, isRefreshingLstStore] = useLstStore((state) => [
    state.initialized,
    state.isRefreshingStore,
  ]);

  // enable matomo heartbeat
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT === "alpha") {
      init({ url: MATOMO_URL, siteId: "1" });
      // accurately measure the time spent in the visit
      push(["enableHeartBeatTimer"]);
    }
  }, []);

  React.useEffect(() => {
    const isFetchingData = isRefreshingMrgnlendStore || isRefreshingLstStore;
    setIsFetchingData(isFetchingData);
  }, [
    isLstStoreInitialised,
    isMrgnlendStoreInitialized,
    isRefreshingLstStore,
    isRefreshingMrgnlendStore,
    setIsFetchingData,
  ]);

  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_API_KEY!, { api_host: "https://app.posthog.com" });
  }, []);

  // if account set in query param then store inn local storage and remove from url
  useEffect(() => {
    const { account } = router.query;
    if (!account) return;

    const prevMfiAccount = localStorage.getItem("mfiAccount");
    if (prevMfiAccount === account) return;

    localStorage.setItem("mfiAccount", account as string);
    router.replace(router.pathname, undefined, { shallow: true });
    fetchMrgnlendState();
  }, [router.query]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <MrgnWalletProvider>
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
              </Mobile>
              <Analytics />
              <Tutorial />
              <WalletAuthDialog />
              <ToastContainer position="bottom-left" theme="dark" />
            </MrgnWalletProvider>
          </WalletProvider>
        </ConnectionProvider>
      )}
    </>
  );
};

export default MyApp;
