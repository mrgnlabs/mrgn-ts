import React, { useEffect, useMemo } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
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
import { Navbar } from "~/components";
import { BorrowLendStateProvider, TokenBalancesProvider, TokenMetadataProvider } from "~/context";
import "react-toastify/dist/ReactToastify.min.css";
import { ToastContainer } from "react-toastify";

// Use require instead of import since order matters
require("@solana/wallet-adapter-react-ui/styles.css");
require("~/styles/globals.css");

// Matomo
const MATOMO_URL = "https://mrgn.matomo.cloud";

const MyApp = ({ Component, pageProps }: AppProps) => {
  // enable matomo heartbeat
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT === "alpha") {
      init({ url: MATOMO_URL, siteId: "2" }); // NOTE: this SITE_ID hasn't been updated in matomo yet
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
          <TokenMetadataProvider>
            <BorrowLendStateProvider>
              <TokenBalancesProvider>
                <Head>
                  <title>marginfi</title>
                  <meta name="description" content="marginfi v2 UI" />
                  <meta name="viewport" content="width=device-width, initial-scale=1" />
                  <link rel="icon" href="/favicon.ico" />
                </Head>
                <Navbar />
                <div className="w-full flex flex-col justify-center items-center pt-[64px]">
                  <Component {...pageProps} />
                </div>
                <ToastContainer position="bottom-left" theme="dark" />
              </TokenBalancesProvider>
            </BorrowLendStateProvider>
          </TokenMetadataProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default MyApp;
