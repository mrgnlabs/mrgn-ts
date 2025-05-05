import React from "react";

import { AppProps } from "next/app";
import { useRouter } from "next/router";
import { GetStaticProps } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { TipLinkWalletAutoConnect } from "@tiplink/wallet-adapter-react-ui";
import { Analytics } from "@vercel/analytics/react";
import { Desktop, Mobile, init as initAnalytics } from "@mrgnlabs/mrgn-utils";
import { generateEndpoint } from "~/rpc.utils";
import { ToastProvider } from "@mrgnlabs/mrgn-toasts";
import { WalletProvider as MrgnWalletProvider } from "@mrgnlabs/mrgn-ui";

import config from "~/config";
import { StaticArenaProps } from "~/utils";
import { getArenaStaticProps } from "~/utils";
import { useUiStore } from "~/store";
import { TradePovider } from "~/context";
import { WALLET_ADAPTERS } from "~/config/wallets";
import { ConnectionProvider } from "~/hooks/use-connection";

import { ActionProvider } from "~/components/action-box-v2";
import { Meta } from "~/components/common/Meta";
import { MobileNavbar } from "~/components/mobile/MobileNavbar";
import { Tutorial } from "~/components/common/Tutorial";
import { Header } from "~/components/common/Header";
import { Footer } from "~/components/desktop/Footer";
import { AuthDialog } from "~/components/wallet-v2";
import { Background } from "~/components/common/Background";

require("~/styles/globals.css");
require("~/styles/fonts.css");

export const getStaticProps: GetStaticProps<StaticArenaProps> = async (context) => {
  return getArenaStaticProps(context);
};

export default function MrgnApp({ Component, pageProps }: AppProps & StaticArenaProps) {
  const { metadata } = pageProps || {};
  const defaultMetadata = {
    title: "The Arena - Memecoin trading with leverage",
    description: "Memecoin trading, with leverage.",
    image: "/metadata/metadata-image-default.png",
  };
  const finalMetadata = {
    ...defaultMetadata,
    ...metadata,
  };

  const { query, isReady } = useRouter();
  const [ready, setReady] = React.useState(false);
  const [rpcEndpoint, setRpcEndpoint] = React.useState("");

  const [broadcastType, priorityFees, jupiterOptions, priorityType, maxCapType] = useUiStore((state) => [
    state.broadcastType,
    state.priorityFees,
    state.jupiterOptions,
    state.priorityType,
    state.maxCapType,
  ]);

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
      <Meta finalMetadata={finalMetadata} />

      {ready && rpcEndpoint && (
        <ConnectionProvider endpoint={rpcEndpoint}>
          <TipLinkWalletAutoConnect isReady={isReady} query={query}>
            <WalletProvider wallets={WALLET_ADAPTERS} autoConnect={true}>
              <MrgnWalletProvider>
                <TradePovider>
                  <ActionProvider
                    transactionSettings={{
                      broadcastType,
                      priorityType,
                      maxCap: priorityFees.maxCapUi ?? 0,
                      maxCapType,
                    }}
                    jupiterOptions={{ ...jupiterOptions, slippageBps: jupiterOptions.slippageBps }}
                    priorityFees={priorityFees}
                  >
                    <Background />

                    <div className="relative z-10">
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
                    </div>
                    <ToastProvider theme="light" />
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
