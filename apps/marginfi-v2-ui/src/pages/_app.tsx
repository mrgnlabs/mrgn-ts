import React from "react";
import App, { AppContext, AppInitialProps, AppProps } from "next/app";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { TipLinkWalletAutoConnect } from "@tiplink/wallet-adapter-react-ui";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react";
import { registerMoonGateWallet } from "@moongate/moongate-adapter";

import { cn, DEFAULT_MAX_CAP, Desktop, Mobile, init as initAnalytics } from "@mrgnlabs/mrgn-utils";
import { ActionBoxProvider, ActionProvider, AuthDialog } from "@mrgnlabs/mrgn-ui";
import { generateEndpoint } from "~/rpc.utils";

import config from "~/config";
import { MrgnlendProvider, LipClientProvider } from "~/context";
import { WALLET_ADAPTERS } from "~/config/wallets";
import { useMrgnlendStore, useUiStore } from "~/store";
import { WalletProvider as MrgnWalletProvider } from "~/components/wallet-v2/hooks/use-wallet.hook";
import { ConnectionProvider } from "~/hooks/use-connection";

import { Meta } from "~/components/common/Meta";
import { MobileNavbar } from "~/components/mobile/MobileNavbar";
import { Tutorial } from "~/components/common/Tutorial";
import { CongestionBanner } from "~/components/common/CongestionBanner";

import "swiper/css";
import "swiper/css/pagination";
import "react-toastify/dist/ReactToastify.min.css";

registerMoonGateWallet({ authMode: "Google", position: "bottom-right" });
registerMoonGateWallet({ authMode: "Ethereum", position: "bottom-right" });

// Use require instead of import since order matters
require("~/styles/globals.css");
require("~/styles/fonts.css");

const Navbar = dynamic(async () => (await import("~/components/common/Navbar")).Navbar, {
  ssr: false,
});

const Footer = dynamic(async () => (await import("~/components/desktop/Footer")).Footer, { ssr: false });

type MrgnAppProps = { path: string };

export default function MrgnApp({ Component, pageProps, path }: AppProps & MrgnAppProps) {
  const [broadcastType, priorityFees, isOraclesStale, setIsFetchingData] = useUiStore((state) => [
    state.broadcastType,
    state.priorityFees,
    state.isOraclesStale,
    state.setIsFetchingData,
  ]);
  const [
    isMrgnlendStoreInitialized,
    isRefreshingMrgnlendStore,
    marginfiClient,
    selectedAccount,
    extendedBankInfos,
    nativeSolBalance,
    accountSummary,
  ] = useMrgnlendStore((state) => [
    state.initialized,
    state.isRefreshingStore,
    state.marginfiClient,
    state.selectedAccount,
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.accountSummary,
  ]);

  const { query, isReady } = useRouter();
  const [ready, setReady] = React.useState(false);
  const [rpcEndpoint, setRpcEndpoint] = React.useState("");

  React.useEffect(() => {
    const isFetchingData = isRefreshingMrgnlendStore;
    setIsFetchingData(isFetchingData);
  }, [isMrgnlendStoreInitialized, isRefreshingMrgnlendStore, setIsFetchingData]);

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
      <Meta path={path} />
      {ready && rpcEndpoint && (
        <ConnectionProvider endpoint={rpcEndpoint}>
          <TipLinkWalletAutoConnect isReady={isReady} query={query}>
            <WalletProvider wallets={WALLET_ADAPTERS} autoConnect={true}>
              <MrgnWalletProvider>
                <MrgnlendProvider>
                  <LipClientProvider>
                    <ActionProvider broadcastType={broadcastType} priorityFees={priorityFees}>
                      <ActionBoxProvider
                        banks={extendedBankInfos}
                        nativeSolBalance={nativeSolBalance}
                        marginfiClient={marginfiClient}
                        selectedAccount={selectedAccount}
                        connected={false}
                        accountSummaryArg={accountSummary}
                      >
                        <CongestionBanner />
                        <Navbar />

                        <Desktop>
                          <WalletModalProvider>
                            <div
                              className={cn(
                                "w-full flex flex-col justify-center items-center",
                                isOraclesStale && "pt-10"
                              )}
                            >
                              <Component {...pageProps} />
                            </div>
                            <Footer />
                          </WalletModalProvider>
                        </Desktop>

                        <Mobile>
                          <div
                            className={cn(
                              "w-full flex flex-col justify-center items-center",
                              isOraclesStale && "pt-16"
                            )}
                          >
                            <Component {...pageProps} />
                          </div>
                          <MobileNavbar />
                        </Mobile>

                        <Analytics />
                        <Tutorial />
                        <AuthDialog
                          mrgnState={{ marginfiClient, selectedAccount, extendedBankInfos, nativeSolBalance }}
                        />
                        <ToastContainer position="bottom-left" theme="dark" />
                      </ActionBoxProvider>
                    </ActionProvider>
                  </LipClientProvider>
                </MrgnlendProvider>
              </MrgnWalletProvider>
            </WalletProvider>
          </TipLinkWalletAutoConnect>
        </ConnectionProvider>
      )}

      {process.env.NEXT_PUBLIC_ANALYTICS === "true" && ready && (
        <>
          <GoogleAnalytics gaId="G-0ZTQRWVG02" />
          <GoogleTagManager gtmId="GTM-KJJ3CR6Q" />
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
