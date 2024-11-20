import React from "react";

import App, { AppContext, AppInitialProps, AppProps } from "next/app";
import { useRouter } from "next/router";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { TipLinkWalletAutoConnect } from "@tiplink/wallet-adapter-react-ui";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react";
import { BankMetadataRaw } from "@mrgnlabs/mrgn-common";
import { DEFAULT_MAX_CAP, Desktop, Mobile, init as initAnalytics } from "@mrgnlabs/mrgn-utils";
import { ActionProvider, AuthDialog } from "@mrgnlabs/mrgn-ui";
import { generateEndpoint } from "~/rpc.utils";

import config from "~/config";
import { useUiStore } from "~/store";
import { TradePovider } from "~/context";
import { WALLET_ADAPTERS } from "~/config/wallets";
import { BANK_METADATA_MAP } from "~/config/trade";
import { WalletProvider as MrgnWalletProvider } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ConnectionProvider } from "~/hooks/use-connection";

import { Meta } from "~/components/common/Meta";
import { MobileNavbar } from "~/components/mobile/MobileNavbar";
import { Tutorial } from "~/components/common/Tutorial";
import { Header } from "~/components/common/Header";
import { Footer } from "~/components/desktop/Footer";

import "react-toastify/dist/ReactToastify.min.css";

require("~/styles/globals.css");
require("~/styles/fonts.css");

type MrgnAppProps = { path: string; bank: BankMetadataRaw | null };

export default function MrgnApp({ Component, pageProps, path, bank }: AppProps & MrgnAppProps) {
  const { query, isReady } = useRouter();
  const [ready, setReady] = React.useState(false);
  const [rpcEndpoint, setRpcEndpoint] = React.useState("");

  const [broadcastType, priorityFees] = useUiStore((state) => [state.broadcastType, state.priorityFees]);

  React.useEffect(() => {
    const init = async () => {
      const rpcEndpoint = await generateEndpoint(config.rpcEndpoint, process.env.NEXT_PUBLIC_RPC_PROXY_KEY ?? "");
      setRpcEndpoint(rpcEndpoint);
      setReady(true);
      initAnalytics();
    };

    init();
  }, []);

  return (
    <>
      <Meta path={path} bank={bank} />
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
      {process.env.NEXT_PUBLIC_ANALYTICS === "true" && (
        <>
          <GoogleAnalytics gaId="G-T5B2WRLKL9" />
          <GoogleTagManager gtmId="GTM-WFBC4RZ7" />
          <SpeedInsights />
        </>
      )}
    </>
  );
}

MrgnApp.getInitialProps = async (appContext: AppContext): Promise<AppInitialProps & MrgnAppProps> => {
  const appProps = await App.getInitialProps(appContext);
  const path = appContext.ctx.asPath;
  let bank = null;

  if (path && path.includes("/trade")) {
    const cleanPath = path.split("?")[0];
    const groupAddress = cleanPath.split("/trade/")[1];
    const res = await fetch(BANK_METADATA_MAP);
    const data = await res.json();
    bank = data.find((bank: BankMetadataRaw) => bank.groupAddress === groupAddress);
  }

  return { ...appProps, path: path || "/", bank };
};
