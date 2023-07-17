import React, { useEffect, useMemo } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  BackpackWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  OKXWalletAdapter
} from "~/context/OKXWallet";
import { init, push } from "@socialgouv/matomo-next";
import config from "../config";
import { Navbar, Footer } from "~/components";

import {
  BanksStateProvider,
  ProgramProvider,
  TokenAccountsProvider,
  TokenMetadataProvider,
  UserAccountsProvider,
} from "~/context";
import "react-toastify/dist/ReactToastify.min.css";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react";
import { RecoilRoot } from 'recoil';

// Use require instead of import since order matters
require("@solana/wallet-adapter-react-ui/styles.css");
require("~/styles/globals.css");
require("~/styles/fonts.css");
require("~/styles/asset-borders.css");

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

  const wallets = useMemo(
    () => [
      new OKXWalletAdapter(),
      new BackpackWalletAdapter(),
      new PhantomWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={config.rpcEndpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ProgramProvider>
            <TokenMetadataProvider>
              <BanksStateProvider>
                <TokenAccountsProvider>
                  <UserAccountsProvider>
                    <Head>
                      <title>marginfi</title>
                      <meta name="description" content="marginfi v2 UI" />
                      <meta name="viewport" content="width=device-width, initial-scale=1" />
                      <link rel="icon" href="/favicon.ico" />
                    </Head>
                    <RecoilRoot>
                      <Navbar />
                      <div className="w-full flex flex-col justify-center items-center pt-[24px] sm:pt-[64px]">
                        <Component {...pageProps} />
                        <Analytics />
                      </div>
                      <Footer />
                      <ToastContainer position="bottom-left" theme="dark" />
                    </RecoilRoot>
                  </UserAccountsProvider>
                </TokenAccountsProvider>
              </BanksStateProvider>
            </TokenMetadataProvider>
          </ProgramProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default MyApp;
