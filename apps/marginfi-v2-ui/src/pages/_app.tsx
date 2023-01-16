import React, { useEffect, useMemo } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  BackpackWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { init, push } from "@socialgouv/matomo-next";
import config from "../config";

import { Navbar } from "../components";
import { BorrowLendStateProvider } from "../context/BorrowLendContext";
import "react-toastify/dist/ReactToastify.min.css";
import { ToastContainer } from "react-toastify";
import Script from "next/dist/client/script";
import { TokenBalancesProvider } from "~/context/TokenAccountsContext";

// Vivid
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  import("vivid-studio").then((v) => v.run());
  import("vivid-studio/style.css");
}

// Use require instead of import since order matters
require("@solana/wallet-adapter-react-ui/styles.css");
require("~/styles/globals.css");

// Matomo
const MATOMO_URL = "https://mrgn.matomo.cloud";
const MATOMO_SITE_ID = "2"; // @todo this SITE_ID hasn't been updated in matomo yet

const MyApp = ({ Component, pageProps }: AppProps) => {
  // enable matomo heartbeat
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === "production") {
      init({ url: MATOMO_URL, siteId: MATOMO_SITE_ID });
      // accurately measure the time spent in the visit
      push(["enableHeartBeatTimer"]);
    }
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolletWalletAdapter(),
      new LedgerWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={config.rpcEndpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BorrowLendStateProvider>
            <TokenBalancesProvider>
              <div
                // @todo `absolute` here may break ux when there are so many assets you have to scroll
                className="absolute h-[200vh] w-[200vw] bg-gradient-radial from-[#171C1F] to-[#010101] translate-x-[-45%] translate-y-[-50%]"
              />
              <Script src="https://cdn.tailwindcss.com"></Script>
              <Head>
                <title>marginfi</title>
                <meta name="description" content="marginfi v2 UI" />
                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1"
                />
                <link rel="icon" href="/favicon.ico" />
              </Head>
              <Navbar />
              <Component {...pageProps} />
              <ToastContainer position="bottom-left" theme="dark" />
            </TokenBalancesProvider>
          </BorrowLendStateProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default MyApp;
