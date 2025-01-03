import React from "react";

import { AppProps } from "next/app";
import { useRouter } from "next/router";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { TipLinkWalletAutoConnect } from "@tiplink/wallet-adapter-react-ui";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react";
import { Desktop, Mobile, init as initAnalytics } from "@mrgnlabs/mrgn-utils";
import { ActionProvider } from "~/components/action-box-v2";
import { generateEndpoint } from "~/rpc.utils";

import config from "~/config";
import { useUiStore } from "~/store";
import { TradePovider } from "~/context";
import { WALLET_ADAPTERS } from "~/config/wallets";
import { WalletProvider as MrgnWalletProvider } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ConnectionProvider } from "~/hooks/use-connection";

import { Meta } from "~/components/common/Meta";
import { MobileNavbar } from "~/components/mobile/MobileNavbar";
import { Tutorial } from "~/components/common/Tutorial";
import { Header } from "~/components/common/Header";
import { Footer } from "~/components/desktop/Footer";

import "react-toastify/dist/ReactToastify.min.css";
import { AuthDialog } from "~/components/wallet-v2";
import { StaticArenaProps } from "~/utils";
import { getArenaStaticProps } from "~/utils";
import { GetStaticProps } from "next";
import { GeoBlockingWrapper } from "~/components/common/geo-blocking-wrapper";

require("~/styles/globals.css");
require("~/styles/fonts.css");

export const getStaticProps: GetStaticProps<StaticArenaProps> = async (context) => {
  return getArenaStaticProps(context);
};

export default function MrgnApp({ Component, pageProps }: AppProps & StaticArenaProps) {
  const { query, isReady } = useRouter();
  const [ready, setReady] = React.useState(false);
  const [rpcEndpoint, setRpcEndpoint] = React.useState("");

  const [broadcastType, priorityFees] = useUiStore((state) => [state.broadcastType, state.priorityFees]);

  React.useEffect(() => {
    const initializeApp = () => {
      try {
        const endpoint = generateEndpoint(config.rpcEndpoint, process.env.NEXT_PUBLIC_RPC_PROXY_KEY ?? "");

        setRpcEndpoint(endpoint);
        setReady(true);
        initAnalytics();
      } catch (error) {
        console.error("Failed to initialize:", error);
      }
    };

    initializeApp();
  }, []);

  return (
    <>
      <Meta />
      {ready && rpcEndpoint && (
        <ConnectionProvider endpoint={rpcEndpoint}>
          <TipLinkWalletAutoConnect isReady={isReady} query={query}>
            <WalletProvider wallets={WALLET_ADAPTERS} autoConnect={true}>
              <MrgnWalletProvider>
                <TradePovider>
                  <ActionProvider broadcastType={broadcastType} priorityFees={priorityFees}>
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

                      <AuthDialog onboardingEnabled={false} />
                      <ToastContainer position="bottom-left" theme="light" />
                    </div>
                  </ActionProvider>
                </TradePovider>
              </MrgnWalletProvider>
            </WalletProvider>
          </TipLinkWalletAutoConnect>
        </ConnectionProvider>
      )}
      <Tutorial />
      {process.env.NEXT_PUBLIC_ANALYTICS === "true" && ready && (
        <>
          <GoogleAnalytics gaId="G-T5B2WRLKL9" />
          <GoogleTagManager gtmId="GTM-WFBC4RZ7" />
          <SpeedInsights />
        </>
      )}
    </>
  );
}
