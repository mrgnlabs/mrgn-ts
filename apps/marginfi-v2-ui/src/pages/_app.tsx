import React from "react";

import App, { AppContext, AppInitialProps, AppProps } from "next/app";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import { WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { TipLinkWalletAutoConnect } from "@tiplink/wallet-adapter-react-ui";
import { init, push } from "@socialgouv/matomo-next";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react";
import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import config from "~/config";
import { MrgnlendProvider, LipClientProvider } from "~/context";
import { WALLET_ADAPTERS } from "~/config/wallets";
import { useMrgnlendStore, useUiStore } from "~/store";
import { useLstStore } from "~/store";
import { WalletProvider as MrgnWalletProvider } from "~/hooks/useWalletContext";
import { ConnectionProvider } from "~/hooks/useConnection";
import { init as initAnalytics } from "~/utils/analytics";
import { cn } from "~/utils";

import { Meta } from "~/components/common/Meta";
import { MobileNavbar } from "~/components/mobile/MobileNavbar";
import { Tutorial } from "~/components/common/Tutorial";
import { CongestionBanner } from "~/components/common/CongestionBanner";

import "swiper/css";
import "swiper/css/pagination";
import "react-toastify/dist/ReactToastify.min.css";
import { AuthDialog } from "~/components/common/Wallet/components/AuthenticationV2";

import { registerMoonGateWallet } from "@moongate/moongate-adapter";

registerMoonGateWallet({ authMode: "Google", position: "bottom-right" });
registerMoonGateWallet({ authMode: "Ethereum", position: "bottom-right" });

// Use require instead of import since order matters
require("~/styles/globals.css");
require("~/styles/fonts.css");

const Navbar = dynamic(async () => (await import("~/components/common/Navbar")).Navbar, {
  ssr: false,
});

const Footer = dynamic(async () => (await import("~/components/desktop/Footer")).Footer, { ssr: false });

const MATOMO_URL = "https://mrgn.matomo.cloud";

type MrgnAppProps = { path: string };

export default function MrgnApp({ Component, pageProps, path }: AppProps & MrgnAppProps) {
  const [setIsFetchingData, isOraclesStale] = useUiStore((state) => [state.setIsFetchingData, state.isOraclesStale]);
  const [isMrgnlendStoreInitialized, isRefreshingMrgnlendStore, fetchMrgnlendState] = useMrgnlendStore((state) => [
    state.initialized,
    state.isRefreshingStore,
    state.fetchMrgnlendState,
  ]);
  const [isLstStoreInitialised, isRefreshingLstStore] = useLstStore((state) => [
    state.initialized,
    state.isRefreshingStore,
  ]);

  const { query, isReady, asPath } = useRouter();

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
    initAnalytics();
  }, []);

  return (
    <>
      <Meta path={path} />
      {ready && (
        <ConnectionProvider endpoint={config.rpcEndpoint}>
          <TipLinkWalletAutoConnect isReady={isReady} query={query}>
            <WalletProvider wallets={WALLET_ADAPTERS} autoConnect={true}>
              <MrgnWalletProvider>
                <MrgnlendProvider>
                  <LipClientProvider>
                    <CongestionBanner />
                    <Navbar />

                    <Desktop>
                      <WalletModalProvider>
                        <div
                          className={cn("w-full flex flex-col justify-center items-center", isOraclesStale && "pt-10")}
                        >
                          <Component {...pageProps} />
                        </div>
                        <Footer />
                      </WalletModalProvider>
                    </Desktop>

                    <Mobile>
                      <div
                        className={cn("w-full flex flex-col justify-center items-center", isOraclesStale && "pt-16")}
                      >
                        <Component {...pageProps} />
                      </div>
                      <MobileNavbar />
                    </Mobile>

                    <Analytics />
                    <Tutorial />
                    <AuthDialog />
                    <ToastContainer position="bottom-left" theme="dark" />
                  </LipClientProvider>
                </MrgnlendProvider>
              </MrgnWalletProvider>
            </WalletProvider>
          </TipLinkWalletAutoConnect>
        </ConnectionProvider>
      )}

      {process.env.NEXT_PUBLIC_ANALYTICS === "true" && isReady && (
        <>
          <GoogleAnalytics gaId="G-0ZTQRWVG02" />
          <SpeedInsights />
        </>
      )}
    </>
  );
}

MrgnApp.getInitialProps = async (appContext: AppContext): Promise<AppInitialProps & MrgnAppProps> => {
  const appProps = await App.getInitialProps(appContext);
  const path = appContext.ctx.pathname;
  return { ...appProps, path };
};
