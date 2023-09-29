import React, { useEffect, useMemo, useState } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  BackpackWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  GlowWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { OKXWalletAdapter } from "~/utils";
import { init, push } from "@socialgouv/matomo-next";
import config from "~/config";

import "react-toastify/dist/ReactToastify.min.css";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react";
import dynamic from "next/dynamic";
import { Desktop, Mobile } from "~/mediaQueries";
import { MobileNavbar } from "~/components/mobile/MobileNavbar";
import { WalletButton } from "~/components/common/Navbar";

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
  // enable matomo heartbeat
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT === "alpha") {
      init({ url: MATOMO_URL, siteId: "1" });
      // accurately measure the time spent in the visit
      push(["enableHeartBeatTimer"]);
    }
  }, []);

  const [ready, setReady] = useState(false);

  const wallets = useMemo(
    () => [new OKXWalletAdapter(), new LedgerWalletAdapter(), new SolflareWalletAdapter(), new GlowWalletAdapter()],
    []
  );

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
      </Head>
      {ready && (
        <ConnectionProvider endpoint={config.rpcEndpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <Desktop>
                <DesktopNavbar />
                <div className="w-full flex flex-col justify-center items-center pt-[64px]">
                  <Component {...pageProps} />
                  <Analytics />
                </div>
                <Footer />
              </Desktop>
              <Mobile>
                <MobileNavbar />
                <div className="w-full flex flex-col justify-center items-center sm:pt-[24px]">
                  <Component {...pageProps} />
                  <Analytics />
                </div>
              </Mobile>
              <ToastContainer position="bottom-left" theme="dark" />
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      )}
    </>
  );
};

export default MyApp;
