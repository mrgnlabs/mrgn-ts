import React from "react";

import App, { AppContext, AppInitialProps, AppProps } from "next/app";
import { useRouter } from "next/router";

import { WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { TipLinkWalletAutoConnect } from "@tiplink/wallet-adapter-react-ui";
import { init, push } from "@socialgouv/matomo-next";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react";

import config from "~/config";
import { MrgnlendProvider, LipClientProvider, TradePovider } from "~/context";
import { WALLET_ADAPTERS } from "~/config/wallets";
import { useTradeStore } from "~/store";
import { Desktop, Mobile } from "~/mediaQueries";
import { WalletProvider as MrgnWalletProvider } from "~/hooks/useWalletContext";
import { ConnectionProvider } from "~/hooks/useConnection";
import { init as initAnalytics } from "~/utils/analytics";

import { Meta } from "~/components/common/Meta";
import { MobileNavbar } from "~/components/mobile/MobileNavbar";
import { Tutorial } from "~/components/common/Tutorial";
import { WalletAuthDialog } from "~/components/common/Wallet";
import { Header } from "~/components/common/Header";
import { Footer } from "~/components/desktop/Footer";

import "swiper/css";
import "swiper/css/pagination";
import "react-toastify/dist/ReactToastify.min.css";

// Use require instead of import since order matters
require("@solana/wallet-adapter-react-ui/styles.css");
require("~/styles/globals.css");
require("~/styles/fonts.css");
require("~/styles/asset-borders.css");

const MATOMO_URL = "https://mrgn.matomo.cloud";

type MrgnAppProps = { path: string };

export default function MrgnApp({ Component, pageProps, path }: AppProps & MrgnAppProps) {
  const [activeGroupPk, groupMap] = useTradeStore((state) => [state.activeGroup, state.groupMap]);

  const activeGroup = React.useMemo(() => {
    const group = activeGroupPk ? groupMap.get(activeGroupPk.toBase58()) : null;
    return group ? { token: group.pool.token, usdc: group.pool.quoteTokens[0] } : null;
  }, [activeGroupPk, groupMap]);

  const { query, isReady } = useRouter();

  // enable matomo heartbeat
  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT === "alpha") {
      init({ url: MATOMO_URL, siteId: "1" });
      // accurately measure the time spent in the visit
      push(["enableHeartBeatTimer"]);
    }
  }, []);

  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
    initAnalytics();
  }, []);

  return (
    <>
      <Meta path={path} activeGroup={activeGroup} />
      {ready && (
        <ConnectionProvider endpoint={config.rpcEndpoint}>
          <TipLinkWalletAutoConnect isReady={isReady} query={query}>
            <WalletProvider wallets={WALLET_ADAPTERS} autoConnect={true}>
              <MrgnWalletProvider>
                <MrgnlendProvider>
                  <TradePovider>
                    <LipClientProvider>
                      <div className="mrgn-bg-gradient">
                        <Header />

                        <Desktop>
                          <WalletModalProvider>
                            <div className="w-full flex flex-col justify-center items-center">
                              <Component {...pageProps} />
                            </div>
                            <Footer />
                          </WalletModalProvider>
                        </Desktop>

                        <Mobile>
                          <MobileNavbar />
                          <div className="w-full flex flex-col justify-center items-center">
                            <Component {...pageProps} />
                          </div>
                        </Mobile>
                        <Analytics />

                        <WalletAuthDialog />
                        <ToastContainer position="bottom-left" theme="light" />
                        {/* <ActiveGroup /> */}
                      </div>
                    </LipClientProvider>
                  </TradePovider>
                </MrgnlendProvider>
              </MrgnWalletProvider>
            </WalletProvider>
          </TipLinkWalletAutoConnect>
        </ConnectionProvider>
      )}
      <Tutorial />
    </>
  );
}

MrgnApp.getInitialProps = async (appContext: AppContext): Promise<AppInitialProps & MrgnAppProps> => {
  const appProps = await App.getInitialProps(appContext);
  const path = appContext.ctx.pathname;
  return { ...appProps, path };
};
