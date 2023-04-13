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
import {
  BanksStateProvider,
  ProgramProvider,
  TokenAccountsProvider,
  TokenMetadataProvider,
  UserAccountsProvider,
  JupiterApiProvider,
} from "~/context";
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
    if (process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT === "production") {
      init({ url: MATOMO_URL, siteId: "2" });
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
          <ProgramProvider>
            <TokenMetadataProvider>
              <BanksStateProvider>
                <TokenAccountsProvider>
                  <UserAccountsProvider>
                    <JupiterApiProvider>
                      <Head>
                        <title>omni</title>
                        <meta name="description" content="Omni, an autonomous agent that helps humans interact with the Solana blockchain." />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <link rel="icon" href="/favicon.ico" />
                      </Head>
                      <Navbar />
                      <div className="w-full flex flex-col justify-center items-center pt-[24px] sm:pt-[64px]">
                        <Component {...pageProps} />
                      </div>
                      <ToastContainer position="bottom-left" theme="dark" />
                    </JupiterApiProvider>
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
